/**
 * Retold Manager -- File Browser + Search Routes
 *
 * Read-only access to a module's working tree:
 *
 *   GET /api/manager/modules/:name/files?path=<rel>
 *        list entries at <rel> (default '')
 *
 *   GET /api/manager/modules/:name/file?path=<rel>
 *        read one text file
 *
 *   GET /api/manager/search?q=<query>&scope=module|repo&module=<name>
 *        ripgrep-preferred search; falls back to grep if rg isn't on
 *        PATH.  Scoped to a single module's tree by default; can search
 *        the whole monorepo via scope=repo.
 *
 * Paths are normalized + path-confined to the module's AbsolutePath
 * (or the repo root for scope=repo).  A '..' segment is rejected
 * outright — no need to permit it for any sane workflow.
 */

const libFs           = require('fs');
const libPath         = require('path');
const libChildProcess = require('child_process');

// Reject paths containing '..' segments OR absolute paths.  Cheaper +
// easier to audit than path-prefix gymnastics.
function isSafeRelativePath(pPath)
{
	if (typeof pPath !== 'string') { return false; }
	if (pPath.length === 0) { return true; }
	if (pPath.startsWith('/')) { return false; }
	let tmpParts = pPath.split('/');
	for (let i = 0; i < tmpParts.length; i++)
	{
		if (tmpParts[i] === '..' || tmpParts[i] === '') { return false; }
	}
	return true;
}

// Best-effort MIME/category for the FE — used for icon selection and
// "render as markdown" vs "render as code" decisions.  Returns
// 'markdown' | 'code' | 'image' | 'binary' | 'text'.
function _classifyExtension(pExt)
{
	let tmpExt = (pExt || '').toLowerCase().replace(/^\./, '');
	if (['md','markdown','mdx'].indexOf(tmpExt) >= 0) { return 'markdown'; }
	if (['png','jpg','jpeg','gif','svg','webp','ico'].indexOf(tmpExt) >= 0) { return 'image'; }
	if (['pdf','zip','tar','gz','bz2','7z','exe','dll','so','dylib','class','jar'].indexOf(tmpExt) >= 0) { return 'binary'; }
	// Common source extensions — anything else falls through to 'text'.
	if (['js','jsx','ts','tsx','mjs','cjs','json','yaml','yml','xml','html','htm','css','scss','sass','less',
		 'sh','bash','zsh','py','rb','rs','go','java','kt','swift','c','h','cpp','hpp','cc','m','mm','pl',
		 'php','sql','toml','ini','conf','dockerfile','makefile'].indexOf(tmpExt) >= 0) { return 'code'; }
	return 'text';
}

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

function _parseQuery(pReq)
{
	let tmpRaw = (pReq.url || '').split('?')[1] || '';
	if (!tmpRaw) { return {}; }
	let tmpOut = {};
	let tmpParams = new URLSearchParams(tmpRaw);
	tmpParams.forEach((value, key) => { tmpOut[key] = value; });
	return tmpOut;
}

// Cap how much we ever ship to the browser per file.  Anything bigger
// the browser would choke on rendering anyway; offer the user the size
// via a `Truncated: true` flag.
const MAX_FILE_BYTES = 1024 * 1024;   // 1 MiB
const MAX_SEARCH_RESULTS = 500;
const SEARCH_TIMEOUT_MS = 8000;

// rg's built-in type names that we'll forward as --type <name>.
// Anything not in here gets translated to a glob include (*.ext) so the
// user can still filter by arbitrary extensions like 'mjs' or 'mdx'.
const _RG_TYPES = [
	'js','jsx','ts','tsx','json','jsonl','html','css','scss','sass','less',
	'md','markdown','py','rb','go','rs','java','kt','kotlin','swift',
	'c','cpp','h','sh','bash','zsh','yaml','toml','ini','xml','sql',
	'lua','php','clojure','elixir','erlang','haskell','make','dockerfile',
	'protobuf','vim','tex','docker','readme','vue','svelte','dart'
];

module.exports = function registerFilesRoutes(pCore)
{
	let tmpOrator   = pCore.Orator;
	let tmpCatalog  = pCore.ModuleCatalog;
	let tmpRepoRoot = tmpCatalog.manifest.getRepoRoot
		? tmpCatalog.manifest.getRepoRoot()
		: libPath.resolve(__dirname, '..', '..');

	// Resolve `rg` vs `grep` once at boot; cache the choice.  Always
	// re-checks if the boot-time lookup failed (slow path).
	let tmpSearchTool = null;
	function _resolveSearchTool(pCallback)
	{
		if (tmpSearchTool) { return pCallback(null, tmpSearchTool); }
		libChildProcess.exec('command -v rg', { encoding: 'utf8' }, function (pRgErr, pRgOut)
		{
			if (!pRgErr && pRgOut && pRgOut.trim())
			{
				tmpSearchTool = { Name: 'rg', Path: pRgOut.trim() };
				return pCallback(null, tmpSearchTool);
			}
			libChildProcess.exec('command -v grep', { encoding: 'utf8' }, function (pErr, pOut)
			{
				if (!pErr && pOut && pOut.trim())
				{
					tmpSearchTool = { Name: 'grep', Path: pOut.trim() };
					return pCallback(null, tmpSearchTool);
				}
				pCallback(new Error('neither rg nor grep are available on PATH'));
			});
		});
	}

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name/files?path=<rel>
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name/files',
		function (pReq, pRes, pNext)
		{
			let tmpName  = pReq.params.name;
			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module named "' + tmpName + '" in the manifest.');
				return pNext();
			}

			let tmpQ = _parseQuery(pReq);
			let tmpRel = tmpQ.path || '';
			if (!isSafeRelativePath(tmpRel))
			{
				respondError(pRes, 400, 'BadPath', 'path must be a relative path with no .. segments');
				return pNext();
			}

			let tmpAbs = tmpRel ? libPath.join(tmpEntry.AbsolutePath, tmpRel) : tmpEntry.AbsolutePath;
			libFs.stat(tmpAbs, function (pStatErr, pStat)
			{
				if (pStatErr || !pStat.isDirectory())
				{
					respondError(pRes, 404, 'NotADirectory', 'No directory at ' + tmpRel);
					return pNext();
				}
				libFs.readdir(tmpAbs, { withFileTypes: true }, function (pReadErr, pEntries)
				{
					if (pReadErr)
					{
						respondError(pRes, 500, 'ReadDirFailed', pReadErr.message);
						return pNext();
					}
					// Skip the predictable noise — node_modules and the
					// 60MB .data SQLite caches.  Hidden dotfiles are
					// kept (.gitignore, .env.example, etc.) so devs can
					// see what's actually in the working tree.
					let tmpSkip = { 'node_modules': 1, '.data': 1, '.git': 1 };

					let tmpResult = [];
					for (let i = 0; i < pEntries.length; i++)
					{
						let tmpEnt = pEntries[i];
						if (tmpSkip[tmpEnt.name]) { continue; }
						let tmpKind = tmpEnt.isDirectory() ? 'dir' : (tmpEnt.isSymbolicLink() ? 'symlink' : 'file');
						let tmpExt  = tmpKind === 'file' ? libPath.extname(tmpEnt.name) : '';
						let tmpCat  = tmpKind === 'file' ? _classifyExtension(tmpExt) : null;
						let tmpFull = libPath.join(tmpAbs, tmpEnt.name);
						let tmpSize = null;
						let tmpModified = null;
						if (tmpKind === 'file')
						{
							try
							{
								let tmpS = libFs.statSync(tmpFull);
								tmpSize = tmpS.size;
								tmpModified = tmpS.mtimeMs;
							}
							catch (e) { /* skip stat errors */ }
						}
						tmpResult.push({
							Name:      tmpEnt.name,
							Kind:      tmpKind,
							Extension: tmpExt,
							Category:  tmpCat,
							Size:      tmpSize,
							Modified:  tmpModified,
							Path:      tmpRel ? (tmpRel + '/' + tmpEnt.name) : tmpEnt.name
						});
					}
					// Dirs first, then files, both alphabetical.
					tmpResult.sort(function (pA, pB)
					{
						if (pA.Kind !== pB.Kind)
						{
							return pA.Kind === 'dir' ? -1 : 1;
						}
						return pA.Name.localeCompare(pB.Name);
					});
					pRes.send({
						Module:   tmpName,
						Path:     tmpRel,
						Entries:  tmpResult
					});
					return pNext();
				});
			});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name/file?path=<rel>
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name/file',
		function (pReq, pRes, pNext)
		{
			let tmpName  = pReq.params.name;
			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module named "' + tmpName + '" in the manifest.');
				return pNext();
			}

			let tmpQ = _parseQuery(pReq);
			let tmpRel = tmpQ.path || '';
			if (!isSafeRelativePath(tmpRel) || tmpRel.length === 0)
			{
				respondError(pRes, 400, 'BadPath', 'path must be a non-empty relative path with no .. segments');
				return pNext();
			}
			let tmpAbs = libPath.join(tmpEntry.AbsolutePath, tmpRel);

			libFs.stat(tmpAbs, function (pStatErr, pStat)
			{
				if (pStatErr || !pStat.isFile())
				{
					respondError(pRes, 404, 'NotAFile', 'No file at ' + tmpRel);
					return pNext();
				}
				let tmpExt = libPath.extname(tmpRel);
				let tmpCat = _classifyExtension(tmpExt);

				// Don't try to read binaries / images as text — surface
				// the metadata so the client can switch to an image
				// viewer or just show the file info.
				if (tmpCat === 'binary' || tmpCat === 'image')
				{
					pRes.send({
						Module:    tmpName,
						Path:      tmpRel,
						Extension: tmpExt,
						Category:  tmpCat,
						Size:      pStat.size,
						Modified:  pStat.mtimeMs,
						Content:   null,
						Truncated: false
					});
					return pNext();
				}

				let tmpTruncated = pStat.size > MAX_FILE_BYTES;
				let tmpReadOpts = tmpTruncated
					? { encoding: 'utf8' }
					: { encoding: 'utf8' };
				// Streamed prefix read for big files; full read otherwise.
				if (tmpTruncated)
				{
					let tmpStream = libFs.createReadStream(tmpAbs, { encoding: 'utf8', start: 0, end: MAX_FILE_BYTES - 1 });
					let tmpBuf = '';
					tmpStream.on('data', (pChunk) => { tmpBuf += pChunk; });
					tmpStream.on('error', (pErr) =>
					{
						respondError(pRes, 500, 'ReadFailed', pErr.message);
						return pNext();
					});
					tmpStream.on('end', () =>
					{
						pRes.send({
							Module:    tmpName,
							Path:      tmpRel,
							Extension: tmpExt,
							Category:  tmpCat,
							Size:      pStat.size,
							Modified:  pStat.mtimeMs,
							Content:   tmpBuf,
							Truncated: true
						});
						return pNext();
					});
					return;
				}
				libFs.readFile(tmpAbs, tmpReadOpts, function (pReadErr, pBody)
				{
					if (pReadErr)
					{
						respondError(pRes, 500, 'ReadFailed', pReadErr.message);
						return pNext();
					}
					pRes.send({
						Module:    tmpName,
						Path:      tmpRel,
						Extension: tmpExt,
						Category:  tmpCat,
						Size:      pStat.size,
						Modified:  pStat.mtimeMs,
						Content:   pBody,
						Truncated: false
					});
					return pNext();
				});
			});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/repo/file?path=<rel>
	//  Read a file relative to the monorepo root.  Same safety guards
	//  + truncation rules as the per-module read.  Used for opening
	//  search hits that fall outside any manifested module (the repo
	//  root's package.json, Retold-Modules-Manifest.json, test/, etc.).
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/repo/file',
		function (pReq, pRes, pNext)
		{
			let tmpQ = _parseQuery(pReq);
			let tmpRel = tmpQ.path || '';
			if (!isSafeRelativePath(tmpRel) || tmpRel.length === 0)
			{
				respondError(pRes, 400, 'BadPath', 'path must be a non-empty relative path with no .. segments');
				return pNext();
			}
			let tmpAbs = libPath.join(tmpRepoRoot, tmpRel);
			libFs.stat(tmpAbs, function (pStatErr, pStat)
			{
				if (pStatErr || !pStat.isFile())
				{
					respondError(pRes, 404, 'NotAFile', 'No file at ' + tmpRel);
					return pNext();
				}
				let tmpExt = libPath.extname(tmpRel);
				let tmpCat = _classifyExtension(tmpExt);

				if (tmpCat === 'binary' || tmpCat === 'image')
				{
					pRes.send({
						Module:    null,
						Path:      tmpRel,
						Extension: tmpExt,
						Category:  tmpCat,
						Size:      pStat.size,
						Modified:  pStat.mtimeMs,
						Content:   null,
						Truncated: false
					});
					return pNext();
				}

				let tmpTruncated = pStat.size > MAX_FILE_BYTES;
				if (tmpTruncated)
				{
					let tmpStream = libFs.createReadStream(tmpAbs, { encoding: 'utf8', start: 0, end: MAX_FILE_BYTES - 1 });
					let tmpBuf = '';
					tmpStream.on('data', (pChunk) => { tmpBuf += pChunk; });
					tmpStream.on('error', (pErr) =>
					{
						respondError(pRes, 500, 'ReadFailed', pErr.message);
						return pNext();
					});
					tmpStream.on('end', () =>
					{
						pRes.send({
							Module:    null,
							Path:      tmpRel,
							Extension: tmpExt,
							Category:  tmpCat,
							Size:      pStat.size,
							Modified:  pStat.mtimeMs,
							Content:   tmpBuf,
							Truncated: true
						});
						return pNext();
					});
					return;
				}
				libFs.readFile(tmpAbs, 'utf8', function (pReadErr, pBody)
				{
					if (pReadErr)
					{
						respondError(pRes, 500, 'ReadFailed', pReadErr.message);
						return pNext();
					}
					pRes.send({
						Module:    null,
						Path:      tmpRel,
						Extension: tmpExt,
						Category:  tmpCat,
						Size:      pStat.size,
						Modified:  pStat.mtimeMs,
						Content:   pBody,
						Truncated: false
					});
					return pNext();
				});
			});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/search?q=<query>&scope=module|repo&module=<name>
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/search',
		function (pReq, pRes, pNext)
		{
			let tmpQ = _parseQuery(pReq);
			let tmpQuery = (tmpQ.q || '').trim();
			let tmpScope = (tmpQ.scope || 'module').toLowerCase();
			let tmpModule = tmpQ.module || null;

			// Filename-type filter — comma-separated list of either
			// rg-known type names (js, json, md, py) or bare file
			// extensions (.js).  We forward to rg as `--type <ext>`
			// when it looks like a known type, and translate to
			// glob includes for grep.  Sanitized to alphanumerics so
			// the user can't smuggle shell metacharacters.
			let tmpTypesRaw = tmpQ.types || '';
			let tmpTypes = tmpTypesRaw
				.split(',')
				.map((pT) => pT.trim().replace(/^\./, '').toLowerCase())
				.filter((pT) => /^[a-z0-9_+\-]{1,16}$/.test(pT));

			if (!tmpQuery)
			{
				respondError(pRes, 400, 'EmptyQuery', 'q (query) is required');
				return pNext();
			}
			if (tmpQuery.length < 2)
			{
				respondError(pRes, 400, 'QueryTooShort', 'query must be at least 2 characters');
				return pNext();
			}
			if (tmpScope !== 'module' && tmpScope !== 'repo')
			{
				respondError(pRes, 400, 'BadScope', 'scope must be "module" or "repo"');
				return pNext();
			}

			let tmpCwd;
			if (tmpScope === 'module')
			{
				if (!tmpModule)
				{
					respondError(pRes, 400, 'NoModule', 'scope=module requires a module name');
					return pNext();
				}
				let tmpEntry = tmpCatalog.getModule(tmpModule);
				if (!tmpEntry)
				{
					respondError(pRes, 404, 'UnknownModule', 'No module named "' + tmpModule + '"');
					return pNext();
				}
				tmpCwd = tmpEntry.AbsolutePath;
			}
			else
			{
				tmpCwd = tmpRepoRoot;
			}

			_resolveSearchTool(function (pResolveErr, pTool)
			{
				if (pResolveErr)
				{
					respondError(pRes, 500, 'SearchToolMissing', pResolveErr.message);
					return pNext();
				}
				let tmpStart = Date.now();
				let tmpArgs;
				if (pTool.Name === 'rg')
				{
					// --line-number --no-heading --column --color never
					// --max-count caps hits per file; --max-filesize keeps
					// us from grepping the 60MB sqlite blobs that aren't
					// excluded by an ignore file.
					tmpArgs = [
						'--line-number', '--no-heading', '--column', '--color', 'never',
						'--max-count', '8',
						'--max-filesize', '2M',
						'--smart-case',
						'--glob', '!node_modules', '--glob', '!.git', '--glob', '!.data',
						'--glob', '!dist', '--glob', '!*.min.js'
					];
					// Type filters: rg treats `--type js` as a known
					// type set; unknown types fall back to a glob include
					// so the user can pass any extension.
					for (let i = 0; i < tmpTypes.length; i++)
					{
						let tmpT = tmpTypes[i];
						if (_RG_TYPES.indexOf(tmpT) >= 0)
						{
							tmpArgs.push('--type', tmpT);
						}
						else
						{
							tmpArgs.push('--glob', '*.' + tmpT);
						}
					}
					tmpArgs.push('--', tmpQuery, '.');
				}
				else
				{
					// grep -rn --color=never --include=... excluded dirs
					// (POSIX grep doesn't support --max-count cleanly per
					// match, so we cap on the client side via slice).
					tmpArgs = [
						'-rn', '--color=never',
						'--exclude-dir=node_modules',
						'--exclude-dir=.git',
						'--exclude-dir=.data',
						'--exclude-dir=dist'
					];
					for (let i = 0; i < tmpTypes.length; i++)
					{
						tmpArgs.push('--include=*.' + tmpTypes[i]);
					}
					tmpArgs.push('-e', tmpQuery, '.');
				}
				libChildProcess.execFile(pTool.Path, tmpArgs,
					{ cwd: tmpCwd, timeout: SEARCH_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
					function (pErr, pStdout, pStderr)
					{
						// rg / grep both exit 1 when there are no
						// matches; that's not a failure.  Treat any
						// non-zero exit + empty stdout as "no hits".
						if (pErr && pErr.killed)
						{
							respondError(pRes, 504, 'SearchTimeout', 'search exceeded ' + SEARCH_TIMEOUT_MS + 'ms');
							return pNext();
						}
						let tmpLines = (pStdout || '').split('\n');
						let tmpResults = [];
						let tmpTotal = 0;
						let tmpTruncated = false;
						for (let i = 0; i < tmpLines.length; i++)
						{
							let tmpLine = tmpLines[i];
							if (!tmpLine) { continue; }
							tmpTotal++;
							if (tmpResults.length >= MAX_SEARCH_RESULTS)
							{
								tmpTruncated = true;
								continue;
							}
							// rg with --column emits PATH:LINE:COL:TEXT
							// grep emits PATH:LINE:TEXT
							let tmpFirst = tmpLine.indexOf(':');
							if (tmpFirst < 0) { continue; }
							let tmpRest = tmpLine.slice(tmpFirst + 1);
							let tmpSecond = tmpRest.indexOf(':');
							if (tmpSecond < 0) { continue; }
							let tmpPath = tmpLine.slice(0, tmpFirst).replace(/^\.\//, '');
							let tmpLineNum = parseInt(tmpRest.slice(0, tmpSecond), 10) || 0;
							let tmpAfter = tmpRest.slice(tmpSecond + 1);
							let tmpCol = 0;
							let tmpText = tmpAfter;
							if (pTool.Name === 'rg')
							{
								let tmpThird = tmpAfter.indexOf(':');
								if (tmpThird >= 0)
								{
									tmpCol = parseInt(tmpAfter.slice(0, tmpThird), 10) || 0;
									tmpText = tmpAfter.slice(tmpThird + 1);
								}
							}
							tmpResults.push({
								Path:    tmpPath,
								Line:    tmpLineNum,
								Column:  tmpCol,
								Text:    tmpText
							});
						}
						pRes.send({
							Tool:       pTool.Name,
							Query:      tmpQuery,
							Scope:      tmpScope,
							Module:     tmpModule,
							ElapsedMs:  Date.now() - tmpStart,
							TotalHits:  tmpTotal,
							Truncated:  tmpTruncated,
							Results:    tmpResults
						});
						return pNext();
					});
			});
		});
};
