/**
 * Retold Manager -- Operations REST Routes
 *
 * Write-side surface. Every write operation returns {OperationId} synchronously;
 * output streams via WebSocket (/ws/manager/operations). Publish is guarded by
 * a PreviewHash handshake so a stale preview can't trigger a surprise publish.
 *
 * Routes:
 *   GET  /api/manager/modules/:name/publish/preview
 *   POST /api/manager/modules/:name/operations/run
 *   POST /api/manager/modules/:name/operations/diff
 *   POST /api/manager/modules/:name/operations/version
 *   POST /api/manager/modules/:name/operations/commit
 *   POST /api/manager/modules/:name/operations/publish
 *   POST /api/manager/modules/:name/operations/bump-and-commit
 *   POST /api/manager/all/operations/status
 *   POST /api/manager/all/operations/update
 *   POST /api/manager/all/operations/checkout
 *   POST /api/manager/operations/:id/cancel
 *   GET  /api/manager/operations/:id
 *   GET  /api/manager/operations/:id/output?q=&since=
 */

const libPath = require('path');

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

function getModuleOr404(pCore, pName, pRes)
{
	let tmpEntry = pCore.ModuleCatalog.getModule(pName);
	if (!tmpEntry)
	{
		respondError(pRes, 404, 'UnknownModule', 'No module named "' + pName + '" in the manifest.');
		return null;
	}
	return tmpEntry;
}

// ─────────────────────────────────────────────
//  Cache of most recent validator previews
//  key: module name, value: { Hash, GeneratedAt, Report }
//  TTL: 5 minutes. Used by the publish route to reject stale previews.
// ─────────────────────────────────────────────

const PREVIEW_TTL_MS = 5 * 60 * 1000;
const _previews = new Map();

function storePreview(pName, pReport)
{
	_previews.set(pName,
		{
			Hash: pReport.PreviewHash,
			GeneratedAt: Date.now(),
			Report: pReport,
		});
}

function getStoredPreview(pName)
{
	let tmpEntry = _previews.get(pName);
	if (!tmpEntry) { return null; }
	if (Date.now() - tmpEntry.GeneratedAt > PREVIEW_TTL_MS)
	{
		_previews.delete(pName);
		return null;
	}
	return tmpEntry;
}

// ─────────────────────────────────────────────
//  Route registration
// ─────────────────────────────────────────────

module.exports = function registerOperationsRoutes(pCore)
{
	let tmpOrator = pCore.Orator;
	let tmpCatalog = pCore.ModuleCatalog;
	let tmpIntrospector = pCore.Introspector;
	let tmpValidator = pCore.Validator;
	let tmpRunner = pCore.ProcessRunner;
	let tmpComposer = pCore.CommitComposer;

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name/publish/preview
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name/publish/preview',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			tmpValidator.validate(tmpEntry.Name).then(
				function (pReport)
				{
					storePreview(tmpEntry.Name, pReport);
					pRes.send(pReport);
					return pNext();
				},
				function (pError)
				{
					respondError(pRes, 500, 'ValidatorError', pError.message);
					return pNext();
				});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name/git/diff
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name/git/diff',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpOptions =
				{
					Path: pReq.query ? pReq.query.path : undefined,
					Staged: pReq.query ? pReq.query.staged === 'true' : false,
					Stat: pReq.query ? pReq.query.stat === 'true' : false,
				};

			let tmpDiff = tmpIntrospector.getGitDiff(tmpEntry.Name, tmpOptions);
			pRes.setHeader('Content-Type', 'text/plain; charset=utf-8');
			pRes.send(tmpDiff);
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name/git/log
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name/git/log',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpLimit = parseInt((pReq.query && pReq.query.limit) || '20', 10);
			let tmpSince = pReq.query ? pReq.query.since : undefined;
			let tmpCommits = tmpIntrospector.getCommitLogSince(tmpEntry.Name, tmpSince, { Limit: tmpLimit });
			pRes.send(tmpCommits);
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/run
	//  Generic wrapper; body { Command, Args, Label? }.
	//  Used for install/test/types/build/pull/push.
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/run',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpBody = pReq.body || {};
			if (!tmpBody.Command || !Array.isArray(tmpBody.Args))
			{
				respondError(pRes, 400, 'BadRequest', 'Body must include Command (string) and Args (array).');
				return pNext();
			}

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running. Cancel it first.');
				return pNext();
			}

			let tmpOperationId = tmpRunner.run(
				{
					Command: tmpBody.Command,
					Args: tmpBody.Args,
					Cwd: tmpEntry.AbsolutePath,
					Label: tmpBody.Label || null,
				});

			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/diff
	//  Canned two-step diff sequence (matches TUI [d]).
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/diff',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running. Cancel it first.');
				return pNext();
			}

			let tmpOperationId = tmpRunner.runSequence(
				{
					Cwd: tmpEntry.AbsolutePath,
					Steps:
						[
							{
								Command: 'git',
								Args: ['diff', '--stat'],
								Label: 'Changed files overview (including dist/):',
							},
							{
								Command: 'git',
								Args: ['diff', '--', '.', ':!dist'],
								Label: 'Full diff (excluding dist/):',
							},
						],
				});

			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/version
	//  body: { Kind: 'patch'|'minor'|'major'|'explicit', Version? }
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/version',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpBody = pReq.body || {};
			let tmpKind = tmpBody.Kind || 'patch';

			let tmpVersionArg;
			if (tmpKind === 'explicit')
			{
				if (!tmpBody.Version || typeof tmpBody.Version !== 'string')
				{
					respondError(pRes, 400, 'BadRequest', 'Kind=explicit requires Version.');
					return pNext();
				}
				tmpVersionArg = tmpBody.Version;
			}
			else if (tmpKind === 'patch' || tmpKind === 'minor' || tmpKind === 'major')
			{
				tmpVersionArg = tmpKind;
			}
			else
			{
				respondError(pRes, 400, 'BadRequest', 'Kind must be patch, minor, major, or explicit.');
				return pNext();
			}

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpOperationId = tmpRunner.run(
				{
					Command: 'npm',
					Args: ['version', tmpVersionArg, '--no-git-tag-version'],
					Cwd: tmpEntry.AbsolutePath,
					Label: 'npm version ' + tmpVersionArg,
				});

			// Invalidate the cached publish preview for this module — the
			// version just changed, so any PreviewHash clients have is stale.
			_previews.delete(tmpEntry.Name);

			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name, Kind: tmpKind });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/git-add
	//  body: { All: true } or { Paths: string[] }
	//  Stages untracked/new files so the next `git commit -a -m` picks them up.
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/git-add',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpBody = pReq.body || {};
			let tmpArgs = ['add'];
			let tmpLabel;

			if (tmpBody.All)
			{
				tmpArgs.push('-A');
				tmpLabel = 'git add -A';
			}
			else if (Array.isArray(tmpBody.Paths) && tmpBody.Paths.length > 0)
			{
				// Validate: no leading '-' (option injection), no absolute paths
				for (let i = 0; i < tmpBody.Paths.length; i++)
				{
					let tmpP = tmpBody.Paths[i];
					if (typeof tmpP !== 'string' || tmpP.length === 0 || tmpP.startsWith('-') || tmpP.startsWith('/'))
					{
						respondError(pRes, 400, 'BadRequest', 'Invalid path: ' + JSON.stringify(tmpP));
						return pNext();
					}
				}
				tmpArgs.push('--');
				tmpArgs = tmpArgs.concat(tmpBody.Paths);
				tmpLabel = 'git add ' + tmpBody.Paths.join(' ').slice(0, 80);
			}
			else
			{
				respondError(pRes, 400, 'BadRequest', 'Body must include All:true or non-empty Paths[].');
				return pNext();
			}

			let tmpOperationId = tmpRunner.run(
				{
					Command: 'git',
					Args: tmpArgs,
					Cwd: tmpEntry.AbsolutePath,
					Label: tmpLabel,
				});

			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/commit
	//  body: { Message }
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/commit',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpBody = pReq.body || {};
			let tmpValidation = tmpComposer.validateMessage(tmpBody.Message);
			if (!tmpValidation.Ok)
			{
				respondError(pRes, 400, 'BadRequest', tmpValidation.Problems.join(' '));
				return pNext();
			}

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpCommit = tmpComposer.buildCommitArgs(tmpBody.Message);
			let tmpOperationId = tmpRunner.run(
				{
					Command: tmpCommit.Command,
					Args: tmpCommit.ShellArgs,
					Cwd: tmpEntry.AbsolutePath,
					Label: 'git commit: ' + tmpCommit.Message.slice(0, 60),
				});

			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/publish
	//  body: { Confirm: true, PreviewHash: 'sha256-...' }
	//  409 if the server's preview hash doesn't match what the client last
	//  saw (preview stale / module has changed since the confirm screen
	//  was rendered).
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/publish',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpBody = pReq.body || {};
			if (tmpBody.Confirm !== true)
			{
				respondError(pRes, 400, 'BadRequest', 'Publish requires Confirm: true.');
				return pNext();
			}
			if (typeof tmpBody.PreviewHash !== 'string')
			{
				respondError(pRes, 400, 'BadRequest', 'Publish requires the PreviewHash from the preview response.');
				return pNext();
			}

			let tmpStored = getStoredPreview(tmpEntry.Name);
			if (!tmpStored)
			{
				respondError(pRes, 409, 'PreviewExpired',
					'No recent preview. Re-run /publish/preview before publishing.');
				return pNext();
			}
			if (tmpStored.Hash !== tmpBody.PreviewHash)
			{
				respondError(pRes, 409, 'PreviewStale',
					'Preview has changed since you reviewed it. Re-check and resubmit.');
				return pNext();
			}
			if (!tmpStored.Report.OkToPublish)
			{
				respondError(pRes, 409, 'NotPublishable',
					'Pre-publish validation failed. See Problems on the preview.');
				return pNext();
			}

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpOperationId = tmpRunner.run(
				{
					Command: 'npm',
					Args: ['publish'],
					Cwd: tmpEntry.AbsolutePath,
					Label: 'npm publish ' + tmpStored.Report.Package + '@' + tmpStored.Report.LocalVersion,
				});

			// Consumed — the hash is no longer valid for another publish.
			_previews.delete(tmpEntry.Name);

			pRes.statusCode = 202;
			pRes.send(
				{
					OperationId: tmpOperationId,
					Module: tmpEntry.Name,
					Version: tmpStored.Report.LocalVersion,
				});
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/operations/ncu
	//  body: { Apply?: bool, Scope?: 'retold'|'all' }
	//  Runs npm-check-updates inside the module. When Apply is true, runs
	//  ncu -u then npm install (as a 2-step sequence). When Scope is 'retold'
	//  (default), a --filter arg restricts ncu to ecosystem modules only.
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/operations/ncu',
		function (pReq, pRes, pNext)
		{
			let tmpEntry = getModuleOr404(pCore, pReq.params.name, pRes);
			if (!tmpEntry) { return pNext(); }

			let tmpBody = pReq.body || {};
			let tmpApply = !!tmpBody.Apply;
			let tmpScope = tmpBody.Scope === 'all' ? 'all' : 'retold';

			if (tmpRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpArgs = [];
			if (tmpApply) { tmpArgs.push('-u'); }
			if (tmpScope === 'retold')
			{
				let tmpEcosystem = tmpCatalog.getAllModuleNames();
				// ncu --filter accepts a comma-separated list (no glob needed).
				tmpArgs.push('--filter');
				tmpArgs.push(tmpEcosystem.join(','));
			}

			let tmpLabelScope = (tmpScope === 'retold') ? 'retold ecosystem' : 'all deps';
			let tmpLabel = (tmpApply ? 'Applying ' : 'Checking ') + tmpLabelScope;

			if (!tmpApply)
			{
				// Single step: show what's outdated.
				let tmpOperationId = tmpRunner.run(
					{
						Command: 'npx',
						Args: ['npm-check-updates'].concat(tmpArgs),
						Cwd: tmpEntry.AbsolutePath,
						Label: tmpLabel,
					});
				pRes.statusCode = 202;
				pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name, Scope: tmpScope, Apply: false });
				return pNext();
			}

			// Apply: ncu -u then npm install so lockfile and node_modules catch up.
			let tmpOperationId = tmpRunner.runSequence(
				{
					Cwd: tmpEntry.AbsolutePath,
					Steps:
						[
							{ Command: 'npx', Args: ['npm-check-updates'].concat(tmpArgs), Label: tmpLabel },
							{ Command: 'npm', Args: ['install'], Label: 'npm install (after ncu -u)' },
						],
				});
			pRes.statusCode = 202;
			pRes.send({ OperationId: tmpOperationId, Module: tmpEntry.Name, Scope: tmpScope, Apply: true });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/all/operations/{status,update,checkout}
	//  Run the repo-wide shell scripts (matches TUI [s] / [r] / [c]).
	// ─────────────────────────────────────────────
	function registerAllScript(pEndpoint, pScript)
	{
		tmpOrator.serviceServer.doPost('/api/manager/all/operations/' + pEndpoint,
			function (pReq, pRes, pNext)
			{
				if (tmpRunner.isRunning())
				{
					respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
					return pNext();
				}
				let tmpOperationId = tmpRunner.run(
					{
						Command: 'bash',
						Args: ['./' + pScript],
						Cwd: tmpCatalog.getModulesPath(),
						Label: pScript,
					});
				pRes.statusCode = 202;
				pRes.send({ OperationId: tmpOperationId, Script: pScript });
				return pNext();
			});
	}
	registerAllScript('status',   'Status.sh');
	registerAllScript('update',   'Update.sh');
	registerAllScript('checkout', 'Checkout.sh');

	// ─────────────────────────────────────────────
	//  POST /api/manager/operations/:id/cancel
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/operations/:id/cancel',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			if (!tmpRunner.isRunning(tmpId))
			{
				respondError(pRes, 404, 'NotRunning', 'No active operation matches id ' + tmpId + '.');
				return pNext();
			}
			tmpRunner.kill(tmpId);
			// Inform the broadcaster so all connected clients get a 'cancelled' frame.
			if (pCore.Broadcaster)
			{
				pCore.Broadcaster.markCancelled(tmpId);
				pCore.Broadcaster.broadcastCancelled(tmpId);
			}
			pRes.send({ OperationId: tmpId, Cancelled: true });
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/operations/:id
	//  GET /api/manager/operations/:id/output
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/operations/:id',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			let tmpBuffer = tmpRunner.getBuffer(tmpId);
			pRes.send(
				{
					OperationId: tmpId,
					Running: tmpRunner.isRunning(tmpId),
					LineCount: tmpBuffer.length,
				});
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/log
	//  GET /api/manager/log?tail=500
	//  Returns the tail of today's on-disk operation log so the UI can show
	//  context around a failed step without needing the user to cat the file.
	// ─────────────────────────────────────────────
	const libFs = require('fs');
	tmpOrator.serviceServer.doGet('/api/manager/log',
		function (pReq, pRes, pNext)
		{
			if (!pCore.Logger)
			{
				respondError(pRes, 404, 'NoLogger', 'Operation logger is not available.');
				return pNext();
			}

			let tmpPath = pCore.Logger.getLogPath();
			let tmpQuery = pReq.query || {};
			let tmpTail = parseInt(tmpQuery.tail, 10);
			if (!Number.isFinite(tmpTail) || tmpTail <= 0) { tmpTail = 500; }
			if (tmpTail > 10000) { tmpTail = 10000; }

			libFs.readFile(tmpPath, 'utf8', function (pError, pContent)
				{
					if (pError)
					{
						pRes.send({ Path: tmpPath, Exists: false, Lines: [] });
						return pNext();
					}
					let tmpAll = pContent.split('\n');
					// Drop trailing empty line from split
					if (tmpAll.length > 0 && tmpAll[tmpAll.length - 1] === '') { tmpAll.pop(); }
					let tmpLines = tmpAll.slice(Math.max(0, tmpAll.length - tmpTail));
					pRes.send(
						{
							Path: tmpPath,
							Exists: true,
							Total: tmpAll.length,
							Lines: tmpLines,
						});
					return pNext();
				});
		});

	tmpOrator.serviceServer.doGet('/api/manager/operations/:id/output',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			let tmpBuffer = tmpRunner.getBuffer(tmpId);
			let tmpQuery = pReq.query || {};

			if (tmpQuery.q)
			{
				let tmpResult = tmpRunner.search(tmpId, tmpQuery.q);
				pRes.send(tmpResult);
				return pNext();
			}

			let tmpSince = parseInt(tmpQuery.since, 10);
			if (!Number.isFinite(tmpSince) || tmpSince < 0) { tmpSince = 0; }
			let tmpLimit = parseInt(tmpQuery.limit, 10);
			if (!Number.isFinite(tmpLimit) || tmpLimit <= 0) { tmpLimit = 5000; }

			pRes.send(
				{
					OperationId: tmpId,
					Total: tmpBuffer.length,
					Since: tmpSince,
					Lines: tmpBuffer.slice(tmpSince, tmpSince + tmpLimit),
				});
			return pNext();
		});
};
