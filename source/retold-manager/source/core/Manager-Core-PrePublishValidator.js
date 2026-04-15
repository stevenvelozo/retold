/**
 * Retold Manager -- Pre-Publish Validator
 *
 * Runs the read-only half of the TUI's `_runPublish` step:
 *   1. Read local package.json
 *   2. Fetch the currently published version on npm
 *   3. Detect "already published" — local version matches npm
 *   4. Walk ecosystem dependencies, report anything whose local range
 *      doesn't cover the latest-published version
 *   5. Gather recent commits (since the published tag if we can find it)
 *
 * Returns a structured report. Rendering is the caller's problem.
 * Neither this function nor the callers spawn `npm publish`.
 *
 * `PreviewHash` is a SHA-256 over the salient fields (package, versions,
 * problem set, commit list). The web transport uses it as a guardrail —
 * the `/publish` POST must echo the previously-seen hash so a stale
 * preview can't trigger a surprise publish.
 */

const libCrypto = require('crypto');

const DEFAULT_NPM_TIMEOUT_MS = 15000;

class PrePublishValidator
{
	/**
	 * @param {object} pOptions
	 * @param {ModuleIntrospector} pOptions.introspector
	 * @param {object} [pOptions.log]
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.introspector = tmpOptions.introspector;
		this.log = tmpOptions.log || null;

		if (!this.introspector)
		{
			throw new Error('PrePublishValidator requires { introspector }');
		}
	}

	/**
	 * Synchronous validation path. Preserves today's TUI timing (one `npm
	 * view` per ecosystem dep, serially). Returns a complete report.
	 *
	 * @param {string} pName          Module name (as it appears in the manifest).
	 * @param {object} [pOptions]
	 * @param {number} [pOptions.Timeout]    Per-npm-view timeout (ms)
	 * @param {number} [pOptions.CommitLimit] Max commits in the summary
	 * @returns {Report}
	 */
	validateSync(pName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpReport = this._buildInitialReport(pName, tmpOptions);
		if (!tmpReport.OkToPublish && tmpReport.Aborted) { return this._finalize(tmpReport); }

		let tmpEcosystemDeps = this.introspector.getEcosystemDepsSync(pName,
			{
				Timeout: tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS,
			});
		tmpReport.EcosystemDeps = tmpEcosystemDeps;
		this._applyEcosystemProblems(tmpReport);

		if (tmpReport.OkToPublish)
		{
			tmpReport.CommitsSincePublish = this.introspector.getCommitLogSince(
				pName,
				tmpReport.PublishedVersion,
				{ Limit: tmpOptions.CommitLimit || 20 });
		}

		return this._finalize(tmpReport);
	}

	/**
	 * Async validation path. Parallelizes ecosystem-dep npm-view calls,
	 * dramatically faster for meadow-endpoints / pict and similar.
	 */
	async validate(pName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpReport = this._buildInitialReport(pName, tmpOptions);
		if (!tmpReport.OkToPublish && tmpReport.Aborted) { return this._finalize(tmpReport); }

		let tmpEcosystemDeps = await this.introspector.getEcosystemDeps(pName,
			{
				Timeout: tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS,
			});
		tmpReport.EcosystemDeps = tmpEcosystemDeps;
		this._applyEcosystemProblems(tmpReport);

		if (tmpReport.OkToPublish)
		{
			tmpReport.CommitsSincePublish = this.introspector.getCommitLogSince(
				pName,
				tmpReport.PublishedVersion,
				{ Limit: tmpOptions.CommitLimit || 20 });
		}

		return this._finalize(tmpReport);
	}

	// ─────────────────────────────────────────────
	//  Internal stages
	// ─────────────────────────────────────────────

	_buildInitialReport(pName, pOptions)
	{
		let tmpReport =
			{
				Module:               pName,
				Package:              null,
				LocalVersion:         null,
				PublishedVersion:     null,    // null = not yet published
				EcosystemDeps:        [],
				Problems:             [],
				CommitsSincePublish:  [],
				OkToPublish:          true,
				Aborted:              false,
				GeneratedAt:          new Date().toISOString(),
				PreviewHash:          null,    // filled in _finalize
			};

		let tmpPkg = this.introspector.readPackageJson(pName);
		if (!tmpPkg)
		{
			tmpReport.Problems.push(
				{
					Code: 'no-package-json',
					Severity: 'error',
					Message: `Cannot read package.json for ${pName}`
				});
			tmpReport.OkToPublish = false;
			tmpReport.Aborted = true;
			return tmpReport;
		}

		tmpReport.Package = tmpPkg.name || pName;
		tmpReport.LocalVersion = tmpPkg.version || '0.0.0';

		// Fetch the currently published version
		tmpReport.PublishedVersion = this.introspector.fetchPublishedVersionSync(tmpReport.Package,
			{
				Cwd: tmpPkg._modulePath,
				Timeout: (pOptions && pOptions.Timeout) || DEFAULT_NPM_TIMEOUT_MS,
			});

		// "Already published" check
		if (tmpReport.PublishedVersion && tmpReport.PublishedVersion === tmpReport.LocalVersion)
		{
			tmpReport.Problems.push(
				{
					Code: 'version-already-published',
					Severity: 'error',
					Message: `Local version v${tmpReport.LocalVersion} matches what is already on npm. Bump the version first.`,
				});
			tmpReport.OkToPublish = false;
			tmpReport.Aborted = true;
		}

		// file: / link: references in ANY dep section. Local dev links
		// break every consumer's `npm install`, so they always block
		// publish — no amount of version gymnastics rescues this.
		this._checkForFileReferences(tmpPkg, tmpReport);

		return tmpReport;
	}

	_checkForFileReferences(pPkg, pReport)
	{
		let tmpSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
		for (let i = 0; i < tmpSections.length; i++)
		{
			let tmpSection = tmpSections[i];
			if (!pPkg[tmpSection]) { continue; }
			let tmpNames = Object.keys(pPkg[tmpSection]);
			for (let j = 0; j < tmpNames.length; j++)
			{
				let tmpName = tmpNames[j];
				let tmpRange = pPkg[tmpSection][tmpName];
				if (typeof tmpRange !== 'string') { continue; }
				if (tmpRange.startsWith('file:') || tmpRange.startsWith('link:'))
				{
					pReport.Problems.push(
						{
							Code: 'local-file-reference',
							Severity: 'error',
							Message: `${tmpSection}.${tmpName} is a local reference (${tmpRange}). Publishing would break every consumer. Replace with a published version range.`,
							DepName: tmpName,
							Section: tmpSection,
							Range: tmpRange,
						});
					pReport.OkToPublish = false;
				}
			}
		}
	}

	_applyEcosystemProblems(pReport)
	{
		let tmpProblematic = [];
		for (let i = 0; i < pReport.EcosystemDeps.length; i++)
		{
			let tmpDep = pReport.EcosystemDeps[i];
			if (tmpDep.LocalLink) { continue; }
			if (tmpDep.Error)
			{
				pReport.Problems.push(
					{
						Code: 'npm-view-failed',
						Severity: 'warn',
						Message: `Could not fetch ${tmpDep.Name} from npm: ${tmpDep.Error}`,
						DepName: tmpDep.Name,
					});
				continue;
			}
			if (!tmpDep.CoversLatest)
			{
				tmpProblematic.push(tmpDep);
				pReport.Problems.push(
					{
						Code: 'ecosystem-dep-stale',
						Severity: 'error',
						Message: `${tmpDep.Name} ${tmpDep.Range} does not cover latest ${tmpDep.LatestOnNpm}`,
						DepName: tmpDep.Name,
						Range: tmpDep.Range,
						LatestOnNpm: tmpDep.LatestOnNpm,
						Section: tmpDep.Section,
					});
			}
		}

		if (tmpProblematic.length > 0)
		{
			pReport.OkToPublish = false;
		}
	}

	_finalize(pReport)
	{
		// Compute preview hash over the decision-critical subset.
		let tmpSalient = JSON.stringify(
			{
				Package:          pReport.Package,
				LocalVersion:     pReport.LocalVersion,
				PublishedVersion: pReport.PublishedVersion,
				Problems:         pReport.Problems.map(function (pP)
					{ return { Code: pP.Code, DepName: pP.DepName, Range: pP.Range, LatestOnNpm: pP.LatestOnNpm }; }),
				OkToPublish:      pReport.OkToPublish,
				CommitHashes:     pReport.CommitsSincePublish.map(function (pC) { return pC.Hash; }),
			});
		let tmpHash = libCrypto.createHash('sha256').update(tmpSalient).digest('hex');
		pReport.PreviewHash = 'sha256-' + tmpHash;
		return pReport;
	}
}

module.exports = PrePublishValidator;
