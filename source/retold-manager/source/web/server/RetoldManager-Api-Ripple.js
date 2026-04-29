/**
 * Retold Manager -- Ripple Sequencer REST + Executor
 *
 * Routes:
 *   POST /api/manager/ripple/plan        — compute a plan (read-only)
 *   POST /api/manager/ripple/run         — start executing a plan
 *   POST /api/manager/ripple/:id/cancel  — halt a running ripple
 *   GET  /api/manager/ripple/:id         — current state
 *
 * The executor runs plans serially. After every non-publish action within
 * a step, it auto-advances. At publish actions it:
 *   1. runs the pre-publish validator
 *   2. broadcasts a `ripple-paused-for-confirm` frame with the report +
 *      preview hash
 *   3. waits for the client to POST /api/manager/ripple/:id/confirm
 *      { Action:'publish', StepOrder, PreviewHash } before running
 *      npm publish
 *
 * Failure at any action halts the ripple; the user can retry or cancel.
 *
 * Ripple WebSocket frames (all carry RippleId):
 *   ripple-start         { Plan }
 *   ripple-step-start    { StepOrder, Module }
 *   ripple-action-start  { StepOrder, ActionIndex, Action }
 *   ripple-action-end    { StepOrder, ActionIndex, Action, Result? }
 *   ripple-paused        { StepOrder, PreviewReport }
 *   ripple-step-complete { StepOrder, Module }
 *   ripple-complete      { Summary }
 *   ripple-failed        { StepOrder?, ActionIndex?, Error }
 *   ripple-cancelled     { StepOrder? }
 *
 * Client → server (via same WS):
 *   { Type:'ripple-confirm', RippleId, StepOrder, Action:'publish' }
 *   { Type:'ripple-cancel',  RippleId }
 */

const libFs = require('fs');
const libPath = require('path');

const libRippleGraph = require('../../core/Manager-Core-RippleGraph.js');

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

function newRippleId()
{
	return 'ripple_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Run a ProcessRunner operation and resolve when it finishes.
 * Rejects on non-zero exit or error.
 */
function runAndAwait(pRunner, pOptions)
{
	return new Promise(function (pResolve, pReject)
		{
			let tmpOpId = 'rex_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
			let fOnEnd = function (pEvent)
			{
				if (pEvent.OperationId !== tmpOpId || !pEvent.IsLastStep) { return; }
				pRunner.removeListener('end',   fOnEnd);
				pRunner.removeListener('error', fOnError);
				if (pEvent.ExitCode === 0) { pResolve(pEvent); }
				else { pReject(new Error('exit ' + pEvent.ExitCode)); }
			};
			let fOnError = function (pEvent)
			{
				if (pEvent.OperationId !== tmpOpId) { return; }
				pRunner.removeListener('end',   fOnEnd);
				pRunner.removeListener('error', fOnError);
				pReject(new Error(pEvent.Message || 'process error'));
			};
			pRunner.on('end',   fOnEnd);
			pRunner.on('error', fOnError);
			pRunner.run(Object.assign({ OperationId: tmpOpId }, pOptions));
		});
}

/**
 * Modify a consumer module's package.json to set Dep's range to NewRange.
 * Writes atomically (tmp + rename). Returns { OldRange, NewRange }.
 */
function updateDependencyRange(pModulePath, pDep, pSection, pNewRange)
{
	let tmpPkgPath = libPath.join(pModulePath, 'package.json');
	let tmpRaw = libFs.readFileSync(tmpPkgPath, 'utf8');

	// Detect indentation: tabs vs N spaces. Default to tab.
	let tmpIndent = '\t';
	let tmpMatch = tmpRaw.match(/\n([\t ]+)"/);
	if (tmpMatch)
	{
		tmpIndent = tmpMatch[1];
	}

	let tmpPkg = JSON.parse(tmpRaw);
	if (!tmpPkg[pSection]) { tmpPkg[pSection] = {}; }
	let tmpOld = tmpPkg[pSection][pDep];
	tmpPkg[pSection][pDep] = pNewRange;

	let tmpNew = JSON.stringify(tmpPkg, null, tmpIndent) + (tmpRaw.endsWith('\n') ? '\n' : '');
	let tmpTmp = tmpPkgPath + '.tmp-' + process.pid + '-' + Date.now();
	let tmpFd = libFs.openSync(tmpTmp, 'w');
	try
	{
		libFs.writeSync(tmpFd, tmpNew, 0, 'utf8');
		libFs.fsyncSync(tmpFd);
	}
	finally
	{
		libFs.closeSync(tmpFd);
	}
	libFs.renameSync(tmpTmp, tmpPkgPath);

	return { OldRange: tmpOld, NewRange: pNewRange };
}

function readModuleVersion(pModulePath)
{
	try
	{
		let tmpPkg = JSON.parse(libFs.readFileSync(libPath.join(pModulePath, 'package.json'), 'utf8'));
		return tmpPkg.version || null;
	}
	catch (pError) { return null; }
}

/**
 * Compare two semver strings (Major.Minor.Patch[-Prerelease]). Returns
 * negative / zero / positive (lexicographic comparison rules: prerelease
 * versions are LOWER than the same MMR without a tag). Returns 0 for
 * unparseable inputs so callers can short-circuit safely.
 */
function compareSemver(pA, pB)
{
	let fParse = function (pV)
	{
		if (typeof pV !== 'string') { return null; }
		let tmpMatch = pV.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
		if (!tmpMatch) { return null; }
		return {
			Major: parseInt(tmpMatch[1], 10),
			Minor: parseInt(tmpMatch[2], 10),
			Patch: parseInt(tmpMatch[3], 10),
			Prerelease: tmpMatch[4] || null,
		};
	};
	let tmpA = fParse(pA);
	let tmpB = fParse(pB);
	if (!tmpA || !tmpB) { return 0; }
	if (tmpA.Major !== tmpB.Major) { return tmpA.Major - tmpB.Major; }
	if (tmpA.Minor !== tmpB.Minor) { return tmpA.Minor - tmpB.Minor; }
	if (tmpA.Patch !== tmpB.Patch) { return tmpA.Patch - tmpB.Patch; }
	if (tmpA.Prerelease && !tmpB.Prerelease) { return -1; }
	if (!tmpA.Prerelease && tmpB.Prerelease) { return 1; }
	if (tmpA.Prerelease && tmpB.Prerelease) { return tmpA.Prerelease.localeCompare(tmpB.Prerelease); }
	return 0;
}

// ─────────────────────────────────────────────
//  Executor state
// ─────────────────────────────────────────────

// rippleId -> { Plan, State, Cancel, PendingConfirm }
const _ripples = new Map();

function rippleSummary(pContext)
{
	return {
		RippleId: pContext.RippleId,
		Plan: pContext.Plan,
		State: pContext.State,
		StartedAt: pContext.StartedAt,
		EndedAt: pContext.EndedAt || null,
	};
}

// ─────────────────────────────────────────────
//  Execution loop
// ─────────────────────────────────────────────

async function executeRipple(pCore, pContext)
{
	let tmpBroadcaster = pCore.Broadcaster;
	let tmpRunner = pCore.ProcessRunner;
	let tmpCatalog = pCore.ModuleCatalog;
	let tmpValidator = pCore.Validator;
	let tmpLogger = pCore.Logger;

	tmpBroadcaster._broadcast(
		{
			Type: 'ripple-start',
			RippleId: pContext.RippleId,
			Plan: pContext.Plan,
		});
	if (tmpLogger) { tmpLogger.rippleStart(pContext.RippleId, pContext.Plan); }

	pContext.State.Status = 'running';
	pContext.State.CurrentStep = 0;

	for (let tmpStepIdx = 0; tmpStepIdx < pContext.Plan.Steps.length; tmpStepIdx++)
	{
		if (pContext.Cancel) { return finalizeRipple(pCore, pContext, 'cancelled'); }

		let tmpStep = pContext.Plan.Steps[tmpStepIdx];
		let tmpEntry = tmpCatalog.getModule(tmpStep.Module);
		if (!tmpEntry)
		{
			return failRipple(pCore, pContext, tmpStepIdx, -1,
				new Error('Module "' + tmpStep.Module + '" disappeared from the manifest.'));
		}

		pContext.State.CurrentStep = tmpStepIdx;
		pContext.State.Steps[tmpStepIdx].Status = 'running';
		tmpBroadcaster._broadcast(
			{
				Type: 'ripple-step-start',
				RippleId: pContext.RippleId,
				StepOrder: tmpStep.Order,
				Module: tmpStep.Module,
			});
		if (tmpLogger) { tmpLogger.rippleStep(pContext.RippleId, tmpStep); }

		for (let tmpActionIdx = 0; tmpActionIdx < tmpStep.Actions.length; tmpActionIdx++)
		{
			if (pContext.Cancel) { return finalizeRipple(pCore, pContext, 'cancelled'); }

			let tmpAction = tmpStep.Actions[tmpActionIdx];
			pContext.State.Steps[tmpStepIdx].CurrentAction = tmpActionIdx;
			tmpBroadcaster._broadcast(
				{
					Type: 'ripple-action-start',
					RippleId: pContext.RippleId,
					StepOrder: tmpStep.Order,
					ActionIndex: tmpActionIdx,
					Action: tmpAction,
				});
			if (tmpLogger) { tmpLogger.rippleAction(pContext.RippleId, tmpStep.Order, tmpActionIdx, tmpAction); }

			try
			{
				let tmpResult = await runAction(pCore, pContext, tmpEntry, tmpStep, tmpAction, tmpStepIdx);
				pContext.State.Steps[tmpStepIdx].ActionResults[tmpActionIdx] = tmpResult;
				tmpBroadcaster._broadcast(
					{
						Type: 'ripple-action-end',
						RippleId: pContext.RippleId,
						StepOrder: tmpStep.Order,
						ActionIndex: tmpActionIdx,
						Action: tmpAction,
						Result: tmpResult,
					});
			}
			catch (pError)
			{
				if (pError && pError.Code === 'RIPPLE_CANCELLED')
				{
					return finalizeRipple(pCore, pContext, 'cancelled');
				}
				return failRipple(pCore, pContext, tmpStepIdx, tmpActionIdx, pError);
			}
		}

		pContext.State.Steps[tmpStepIdx].Status = 'complete';
		tmpBroadcaster._broadcast(
			{
				Type: 'ripple-step-complete',
				RippleId: pContext.RippleId,
				StepOrder: tmpStep.Order,
				Module: tmpStep.Module,
			});
	}

	return finalizeRipple(pCore, pContext, 'complete');
}

async function runAction(pCore, pContext, pEntry, pStep, pAction, pStepIdx)
{
	let tmpRunner = pCore.ProcessRunner;
	let tmpValidator = pCore.Validator;
	let tmpComposer = pCore.CommitComposer;
	let tmpCatalog = pCore.ModuleCatalog;

	switch (pAction.Op)
	{
		case 'update-dep':
		{
			// Resolve the concrete range at runtime: the dep may have just
			// been bumped in an earlier step, so read its current version.
			let tmpDepEntry = tmpCatalog.getModule(pAction.Dep);
			if (!tmpDepEntry)
			{
				throw new Error('update-dep: dep "' + pAction.Dep + '" is not in the manifest.');
			}
			let tmpDepVersion = readModuleVersion(tmpDepEntry.AbsolutePath);
			if (!tmpDepVersion)
			{
				throw new Error('update-dep: could not read version of "' + pAction.Dep + '".');
			}
			let tmpPrefix = (typeof pAction.RangePrefix === 'string') ? pAction.RangePrefix : '^';
			let tmpNewRange = pAction.Range || (tmpPrefix + tmpDepVersion);
			return Object.assign(
				{
					Dep: pAction.Dep,
					ResolvedRange: tmpNewRange,
				},
				updateDependencyRange(pEntry.AbsolutePath, pAction.Dep, pAction.Section, tmpNewRange));
		}

		case 'preflight-clean-tree':
		{
			// Hard-stop the ripple if the module has any uncommitted state
			// before we modify it. Ripple only handles ready-to-go modules.
			let tmpStatus = pCore.Introspector.getGitStatus(pEntry.Name);
			if (tmpStatus && tmpStatus.Files && tmpStatus.Files.length > 0)
			{
				let tmpPaths = tmpStatus.Files.slice(0, 3).map(function (pF) { return pF.Path; }).join(', ');
				let tmpMore = tmpStatus.Files.length > 3 ? ', …' : '';
				throw new Error(tmpStatus.Files.length + ' uncommitted file'
					+ (tmpStatus.Files.length === 1 ? '' : 's')
					+ ' in ' + pEntry.Name + ' — resolve manually before running the ripple. First: '
					+ tmpPaths + tmpMore);
			}
			return { Ok: true, Clean: true };
		}

		case 'commit-final':
		{
			// After publish: stage and commit any remaining changes
			// (version bump in package.json, regenerated dist bundles,
			// lockfile changes). If the tree is already clean, skip
			// cleanly — not every publish leaves artifacts.
			let tmpStatus = pCore.Introspector.getGitStatus(pEntry.Name);
			if (!tmpStatus || !tmpStatus.Files || tmpStatus.Files.length === 0)
			{
				return { Ok: true, Skipped: true, Reason: 'tree already clean' };
			}
			let tmpVersion = readModuleVersion(pEntry.AbsolutePath) || 'unknown';
			let tmpTemplate = pAction.MessageTemplate || 'NPM Version Bump and publish to <version>';
			let tmpMessage = tmpTemplate.replace(/<version>/g, tmpVersion);

			// `git add -A` picks up new files (built bundles) as well as
			// modifications; `git commit -am` misses untracked.
			await runAndAwait(tmpRunner,
				{
					Command: 'git',
					Args: ['add', '-A'],
					Cwd: pEntry.AbsolutePath,
					Label: 'git add -A (post-publish sweep)',
				});

			let tmpCommit = tmpComposer.buildCommitArgs(tmpMessage, { AddAll: false });
			await runAndAwait(tmpRunner,
				{
					Command: tmpCommit.Command,
					Args: tmpCommit.ShellArgs,
					Cwd: pEntry.AbsolutePath,
					Label: 'git commit (post-publish): ' + tmpMessage.slice(0, 50),
				});
			return { Ok: true, Message: tmpMessage, FileCount: tmpStatus.Files.length };
		}

		case 'ncu-retold':
		{
			// Pull ALL retold ecosystem deps forward to their latest npm
			// versions. Complements update-dep (which handles the in-cone deps
			// authoritatively from on-disk). Uses --filter so only ecosystem
			// modules get touched — any unrelated deps (restify, ws, etc) are
			// left alone.
			let tmpEcosystem = tmpCatalog.getAllModuleNames();
			await runAndAwait(tmpRunner,
				{
					Command: 'npx',
					Args: ['npm-check-updates', '-u', '--filter', tmpEcosystem.join(',')],
					Cwd: pEntry.AbsolutePath,
					Label: 'ncu -u (retold)',
				});
			return { Ok: true };
		}

		case 'install':
			await runAndAwait(tmpRunner, { Command: 'npm', Args: ['install'], Cwd: pEntry.AbsolutePath, Label: 'npm install' });
			return { Ok: true };

		case 'push':
			// Pushes the local commits (commit + commit-final) to origin so
			// the module's sidebar marker goes from ↑N back to clean.
			// `git push` is a no-op + exit 0 when there's nothing ahead.
			await runAndAwait(tmpRunner, { Command: 'git', Args: ['push'], Cwd: pEntry.AbsolutePath, Label: 'git push' });
			return { Ok: true };

		case 'test':
			await runAndAwait(tmpRunner, { Command: 'npm', Args: ['test'], Cwd: pEntry.AbsolutePath, Label: 'npm test' });
			return { Ok: true };

		case 'commit':
		{
			// If the action used MessageTemplate, build the message from the
			// resolved update-dep results captured earlier in the step.
			let tmpMessage = pAction.Message;
			if (!tmpMessage)
			{
				let tmpResolvedDeps = collectResolvedDeps(pContext, pStepIdx);
				if (tmpResolvedDeps.length > 0)
				{
					tmpMessage = 'bump ' + tmpResolvedDeps.map(function (pD) { return pD.Dep + '@' + pD.ResolvedRange; }).join(', ');
				}
				else
				{
					tmpMessage = 'bump deps';
				}
			}
			let tmpCommit = tmpComposer.buildCommitArgs(tmpMessage);
			await runAndAwait(tmpRunner, { Command: tmpCommit.Command, Args: tmpCommit.ShellArgs, Cwd: pEntry.AbsolutePath, Label: 'git commit: ' + tmpMessage.slice(0, 60) });
			return { Ok: true, Message: tmpMessage };
		}

		case 'bump':
		{
			let tmpKind = pAction.Kind || 'patch';
			await runAndAwait(tmpRunner,
				{
					Command: 'npm',
					Args: ['version', tmpKind, '--no-git-tag-version'],
					Cwd: pEntry.AbsolutePath,
					Label: 'npm version ' + tmpKind,
				});
			return { Ok: true, Version: readModuleVersion(pEntry.AbsolutePath) };
		}

		case 'bump-if-needed':
		{
			// Producer-step bump: compare local on-disk version vs. what npm
			// has published. Skip the bump if the user already advanced local;
			// run it if local matches npm; fail if local is BEHIND npm
			// (someone/something drifted, surface it before publish).
			let tmpKind = pAction.Kind || 'patch';
			let tmpLocal = readModuleVersion(pEntry.AbsolutePath);
			if (!tmpLocal)
			{
				throw new Error('bump-if-needed: could not read local version of ' + pEntry.Name);
			}

			pCore.Introspector.clearNpmVersionCache();
			let tmpPublished = null;
			try
			{
				tmpPublished = await pCore.Introspector.fetchPublishedVersion(
					pEntry.Name, { Timeout: 10000 });
			}
			catch (pError) { tmpPublished = null; }

			if (!tmpPublished)
			{
				// Never published — the upcoming `npm publish` will create
				// the first version at whatever's in package.json.
				return {
					Ok: true,
					Bumped: false,
					Skipped: true,
					Reason: 'never published; first publish will create v' + tmpLocal,
					LocalVersion: tmpLocal,
				};
			}

			let tmpCmp = compareSemver(tmpLocal, tmpPublished);
			if (tmpCmp > 0)
			{
				return {
					Ok: true,
					Bumped: false,
					Skipped: true,
					Reason: 'already bumped: local v' + tmpLocal + ' is ahead of npm v' + tmpPublished,
					LocalVersion: tmpLocal,
					PublishedVersion: tmpPublished,
				};
			}
			if (tmpCmp < 0)
			{
				throw new Error('bump-if-needed: local v' + tmpLocal
					+ ' is BEHIND npm v' + tmpPublished + ' for ' + pEntry.Name
					+ '. Resolve manually before re-running the ripple.');
			}

			// tmpCmp === 0 → run the bump.
			await runAndAwait(tmpRunner,
				{
					Command: 'npm',
					Args: ['version', tmpKind, '--no-git-tag-version'],
					Cwd: pEntry.AbsolutePath,
					Label: 'npm version ' + tmpKind + ' (bump-if-needed)',
				});
			return {
				Ok: true,
				Bumped: true,
				FromVersion: tmpLocal,
				ToVersion: readModuleVersion(pEntry.AbsolutePath),
				PublishedVersion: tmpPublished,
			};
		}

		case 'publish':
			return runPublishWithConfirm(pCore, pContext, pEntry, pStep, pStepIdx);

		default:
			throw new Error('Unknown action: ' + pAction.Op);
	}
}

function collectResolvedDeps(pContext, pStepIdx)
{
	let tmpResults = pContext.State.Steps[pStepIdx].ActionResults || [];
	let tmpDeps = [];
	for (let i = 0; i < tmpResults.length; i++)
	{
		let tmpR = tmpResults[i];
		if (tmpR && tmpR.Dep && tmpR.ResolvedRange) { tmpDeps.push(tmpR); }
	}
	return tmpDeps;
}

/**
 * After a successful `npm publish`, wait for the npm registry to actually
 * serve the new version before letting the ripple proceed to the next
 * consumer. Without this wait, the next consumer's `npm install` races
 * the CDN and fails with ETARGET ("No matching version found for X@^Y").
 *
 * Broadcasts synthetic `stdout` frames (with a wait-specific OperationId)
 * so the per-step output panel shows what we're waiting on, and logs every
 * attempt to the on-disk log.
 */
async function awaitRegistryCatchUp(pCore, pContext, pEntry)
{
	let tmpIntrospector = pCore.Introspector;
	let tmpBroadcaster = pCore.Broadcaster;
	let tmpLogger = pCore.Logger;

	let tmpExpected = readModuleVersion(pEntry.AbsolutePath);
	if (!tmpExpected) { return; }

	const MAX_MS = 120000;
	const INTERVAL_MS = 2500;
	let tmpStart = Date.now();
	let tmpAttempts = 0;
	let tmpSyntheticOpId = 'ripple-wait-' + pEntry.Name;

	function emit(pChannel, pText)
	{
		tmpBroadcaster._broadcast(
			{
				Type: 'stdout',
				OperationId: tmpSyntheticOpId,
				Channel: pChannel,
				Text: pText,
			});
	}

	emit('meta', '──────────── waiting for npm registry to index ' + pEntry.Name + '@' + tmpExpected + ' ────────────');

	while (Date.now() - tmpStart < MAX_MS)
	{
		if (pContext.Cancel)
		{
			let tmpErr = new Error('cancelled');
			tmpErr.Code = 'RIPPLE_CANCELLED';
			throw tmpErr;
		}
		tmpAttempts++;
		tmpIntrospector.clearNpmVersionCache();
		let tmpSeen = null;
		try { tmpSeen = await tmpIntrospector.fetchPublishedVersion(pEntry.Name, { Timeout: 10000 }); }
		catch (pError) { tmpSeen = null; }

		if (tmpSeen === tmpExpected)
		{
			let tmpElapsed = Date.now() - tmpStart;
			let tmpMsg = '✓ npm indexed ' + pEntry.Name + '@' + tmpExpected
				+ ' after ' + tmpElapsed + 'ms (' + tmpAttempts + ' check' + (tmpAttempts === 1 ? '' : 's') + ')';
			emit('meta', tmpMsg);
			if (tmpLogger)
			{
				tmpLogger.ripple('REGOK  ' + pContext.RippleId
					+ '  package=' + pEntry.Name + '@' + tmpExpected
					+ '  elapsed=' + tmpElapsed + 'ms  attempts=' + tmpAttempts);
			}
			return;
		}

		emit('meta',
			'... npm reports ' + (tmpSeen || '(unindexed)')
			+ ', waiting for ' + tmpExpected
			+ ' (attempt ' + tmpAttempts + ')');
		if (tmpLogger)
		{
			tmpLogger.ripple('REGWAIT ' + pContext.RippleId
				+ '  package=' + pEntry.Name
				+ '  seen=' + (tmpSeen || '(none)') + '  want=' + tmpExpected
				+ '  attempt=' + tmpAttempts);
		}

		await new Promise(function (r) { setTimeout(r, INTERVAL_MS); });
	}

	throw new Error('Timed out after ' + Math.round((Date.now() - tmpStart) / 1000)
		+ 's waiting for npm to index ' + pEntry.Name + '@' + tmpExpected);
}

function runPublishWithConfirm(pCore, pContext, pEntry, pStep, pStepIdx)
{
	let tmpRunner = pCore.ProcessRunner;
	let tmpValidator = pCore.Validator;
	let tmpBroadcaster = pCore.Broadcaster;

	return tmpValidator.validate(pEntry.Name).then(function (pReport)
		{
			// Store it on the context so the client can POST /confirm with this hash
			pContext.PendingPublish =
				{
					StepOrder: pStep.Order,
					Module: pEntry.Name,
					Report: pReport,
				};

			tmpBroadcaster._broadcast(
				{
					Type: 'ripple-paused',
					RippleId: pContext.RippleId,
					StepOrder: pStep.Order,
					Module: pEntry.Name,
					PreviewReport: pReport,
					Reason: pReport.OkToPublish ? 'awaiting-confirm' : 'validation-failed',
				});
			if (pCore.Logger) { pCore.Logger.ripplePaused(pContext.RippleId, pStep.Order, pReport); }

			if (!pReport.OkToPublish)
			{
				throw new Error('Pre-publish validation failed: '
					+ pReport.Problems.map(function (pP) { return pP.Message; }).join('; '));
			}

			pContext.State.Status = 'paused';
			pContext.State.Steps[pStepIdx].Status = 'paused';

			return new Promise(function (pResolve, pReject)
				{
					pContext.PendingConfirm =
						{
							StepOrder: pStep.Order,
							Action: 'publish',
							ExpectedHash: pReport.PreviewHash,
							Resolve: function () { pResolve(); },
							Reject: pReject,
						};
				});
		}).then(function ()
		{
			pContext.PendingPublish = null;
			pContext.PendingConfirm = null;
			pContext.State.Status = 'running';
			pContext.State.Steps[pStepIdx].Status = 'running';

			return runAndAwait(tmpRunner,
				{
					Command: 'npm',
					Args: ['publish'],
					Cwd: pEntry.AbsolutePath,
					Label: 'npm publish',
				});
		}).then(function ()
		{
			// Publish succeeded — give the npm registry a chance to index
			// the new version before the next consumer's install runs. This
			// closes the ETARGET race that broke the meadow-connection-mysql
			// ripple (publish at T, next install at T+1ms → 404).
			return awaitRegistryCatchUp(pCore, pContext, pEntry);
		}).then(function () { return { Ok: true }; });
}

function failRipple(pCore, pContext, pStepIdx, pActionIdx, pError)
{
	let tmpBroadcaster = pCore.Broadcaster;
	let tmpLogger = pCore.Logger;
	pContext.State.Status = 'failed';
	pContext.State.FailedStep = pStepIdx;
	pContext.State.FailedAction = pActionIdx;
	pContext.State.Error = pError.message;
	pContext.EndedAt = new Date().toISOString();

	if (pContext.State.Steps[pStepIdx])
	{
		pContext.State.Steps[pStepIdx].Status = 'failed';
	}

	tmpBroadcaster._broadcast(
		{
			Type: 'ripple-failed',
			RippleId: pContext.RippleId,
			StepOrder: pStepIdx,
			ActionIndex: pActionIdx,
			Error: pError.message,
		});
	if (tmpLogger)
	{
		tmpLogger.rippleFail(pContext.RippleId, pStepIdx, pActionIdx, pError);
		tmpLogger.rippleEnd(pContext.RippleId, 'failed');
	}
}

function finalizeRipple(pCore, pContext, pOutcome)
{
	let tmpBroadcaster = pCore.Broadcaster;
	let tmpLogger = pCore.Logger;
	pContext.State.Status = pOutcome;
	pContext.EndedAt = new Date().toISOString();
	tmpBroadcaster._broadcast(
		{
			Type: pOutcome === 'complete' ? 'ripple-complete' : 'ripple-cancelled',
			RippleId: pContext.RippleId,
			Summary: rippleSummary(pContext),
		});
	if (tmpLogger) { tmpLogger.rippleEnd(pContext.RippleId, pOutcome); }
}

// ─────────────────────────────────────────────
//  Inject a WS handler for ripple-confirm / ripple-cancel messages
// ─────────────────────────────────────────────

function wireRippleWsHandlers(pCore)
{
	let tmpBroadcaster = pCore.Broadcaster;
	if (!tmpBroadcaster || tmpBroadcaster._rippleWired) { return; }
	tmpBroadcaster._rippleWired = true;

	// Intercept incoming messages: we can't easily subclass ws here, so we
	// inspect inside the existing `_onConnection` listener by patching it.
	// Simplest: add a new 'ripple-confirm' / 'ripple-cancel' handler by
	// monkey-patching the WebSocketServer's connection flow.
	//
	// OperationBroadcaster's per-client 'message' handler ignores unknown
	// types. We register a parallel 'connection' listener that attaches
	// our own 'message' listener too.
	tmpBroadcaster._wss.on('connection', function (pSocket)
		{
			pSocket.on('message', function (pData)
				{
					let tmpMessage;
					try { tmpMessage = JSON.parse(pData.toString()); }
					catch (pError) { return; }
					if (!tmpMessage || typeof tmpMessage.Type !== 'string') { return; }

					if (tmpMessage.Type === 'ripple-confirm')
					{
						handleRippleConfirm(tmpMessage);
					}
					else if (tmpMessage.Type === 'ripple-cancel')
					{
						handleRippleCancel(tmpMessage);
					}
				});
		});

	function handleRippleConfirm(pMessage)
	{
		let tmpContext = _ripples.get(pMessage.RippleId);
		if (!tmpContext) { return; }
		if (!tmpContext.PendingConfirm) { return; }
		if (tmpContext.PendingConfirm.StepOrder !== pMessage.StepOrder) { return; }
		if (pMessage.PreviewHash && tmpContext.PendingConfirm.ExpectedHash !== pMessage.PreviewHash) { return; }

		let tmpResolve = tmpContext.PendingConfirm.Resolve;
		tmpContext.PendingConfirm = null;
		tmpResolve();
	}

	function handleRippleCancel(pMessage)
	{
		let tmpContext = _ripples.get(pMessage.RippleId);
		if (!tmpContext) { return; }
		tmpContext.Cancel = true;
		if (tmpContext.PendingConfirm)
		{
			let tmpReject = tmpContext.PendingConfirm.Reject;
			tmpContext.PendingConfirm = null;
			let tmpErr = new Error('cancelled');
			tmpErr.Code = 'RIPPLE_CANCELLED';
			tmpReject(tmpErr);
		}
	}
}

// ─────────────────────────────────────────────
//  Route registrar
// ─────────────────────────────────────────────

module.exports = function registerRippleRoutes(pCore)
{
	wireRippleWsHandlers(pCore);

	let tmpOrator = pCore.Orator;
	let tmpCatalog = pCore.ModuleCatalog;
	let tmpIntrospector = pCore.Introspector;

	// Single ripple-graph instance lives alongside the core; invalidate on
	// manifest reload and after any commit/publish so the cache stays fresh.
	let tmpRippleGraph = new libRippleGraph({ manifest: tmpCatalog, log: pCore.Fable && pCore.Fable.log });
	pCore.RippleGraph = tmpRippleGraph;

	// ── POST /api/manager/ripple/plan ──
	// body: { Roots?: string[], Root?: string, ConsumerBumpKind?, ProducerBumpKind?,
	//         RangePrefix?, IncludeDev?, StopAtApps?, RunInstall?, RunTest?, RunPush?,
	//         BringRetoldDepsForward? }
	// Roots[] is preferred; Root is accepted for back-compat (single-root flow).
	tmpOrator.serviceServer.doPost('/api/manager/ripple/plan',
		function (pReq, pRes, pNext)
		{
			let tmpBody = pReq.body || {};

			// Normalize to Roots[].
			let tmpRoots;
			if (Array.isArray(tmpBody.Roots) && tmpBody.Roots.length > 0)
			{
				tmpRoots = tmpBody.Roots.slice();
			}
			else if (tmpBody.Root)
			{
				tmpRoots = [tmpBody.Root];
			}
			else
			{
				respondError(pRes, 400, 'BadRequest', 'Roots[] (or Root) is required.');
				return pNext();
			}

			// Validate every root exists in the manifest.
			for (let i = 0; i < tmpRoots.length; i++)
			{
				if (!tmpCatalog.getModule(tmpRoots[i]))
				{
					respondError(pRes, 404, 'UnknownModule', 'No module "' + tmpRoots[i] + '".');
					return pNext();
				}
			}

			try
			{
				tmpRippleGraph.invalidate();
				let tmpPlan = tmpRippleGraph.buildPlan(
					{
						Roots: tmpRoots,
						ConsumerBumpKind: tmpBody.ConsumerBumpKind || 'patch',
						ProducerBumpKind: tmpBody.ProducerBumpKind || 'patch',
						RangePrefix: tmpBody.RangePrefix !== undefined ? tmpBody.RangePrefix : '^',
						IncludeDev: tmpBody.IncludeDev,
						StopAtApps: tmpBody.StopAtApps,
						RunInstall: tmpBody.RunInstall,
						RunTest: tmpBody.RunTest,
						RunPush: tmpBody.RunPush,
						BringRetoldDepsForward: tmpBody.BringRetoldDepsForward,
					});
				pRes.send(tmpPlan);
			}
			catch (pError)
			{
				respondError(pRes, 500, 'PlanError', pError.message);
			}
			return pNext();
		});

	// ── POST /api/manager/ripple/run ──
	// body: { Plan }  — plan from /ripple/plan, possibly with Steps edited
	tmpOrator.serviceServer.doPost('/api/manager/ripple/run',
		function (pReq, pRes, pNext)
		{
			let tmpBody = pReq.body || {};
			let tmpPlan = tmpBody.Plan;
			if (!tmpPlan || !Array.isArray(tmpPlan.Steps) || tmpPlan.Steps.length === 0)
			{
				respondError(pRes, 400, 'BadRequest', 'Plan with non-empty Steps is required.');
				return pNext();
			}

			if (pCore.ProcessRunner.isRunning())
			{
				respondError(pRes, 409, 'RunnerBusy', 'Another operation is still running.');
				return pNext();
			}

			let tmpRippleId = newRippleId();
			let tmpStepStates = tmpPlan.Steps.map(function (pS)
				{
					return {
						Order: pS.Order,
						Module: pS.Module,
						Status: 'pending',
						CurrentAction: -1,
						ActionResults: [],
					};
				});

			let tmpContext =
				{
					RippleId: tmpRippleId,
					Plan: tmpPlan,
					State:
						{
							Status: 'starting',
							CurrentStep: -1,
							Steps: tmpStepStates,
						},
					StartedAt: new Date().toISOString(),
					Cancel: false,
					PendingConfirm: null,
					PendingPublish: null,
				};
			_ripples.set(tmpRippleId, tmpContext);

			// Kick off the async executor — don't await; response returns immediately.
			executeRipple(pCore, tmpContext).catch(function (pError)
				{
					// Shouldn't happen — executeRipple catches everything. Defensive.
					pCore.Fable.log.error('Ripple executor surfaced error: ' + pError.message);
				});

			pRes.statusCode = 202;
			pRes.send({ RippleId: tmpRippleId });
			return pNext();
		});

	// ── POST /api/manager/ripple/:id/confirm ──
	tmpOrator.serviceServer.doPost('/api/manager/ripple/:id/confirm',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			let tmpContext = _ripples.get(tmpId);
			if (!tmpContext)
			{
				respondError(pRes, 404, 'UnknownRipple', 'No ripple "' + tmpId + '".');
				return pNext();
			}
			if (!tmpContext.PendingConfirm)
			{
				respondError(pRes, 409, 'NotPaused', 'Ripple is not paused for confirmation.');
				return pNext();
			}

			let tmpBody = pReq.body || {};
			if (tmpBody.PreviewHash && tmpContext.PendingConfirm.ExpectedHash !== tmpBody.PreviewHash)
			{
				respondError(pRes, 409, 'PreviewStale', 'Preview hash has changed; ripple halted.');
				return pNext();
			}

			let tmpResolve = tmpContext.PendingConfirm.Resolve;
			tmpContext.PendingConfirm = null;
			tmpResolve();
			pRes.send({ RippleId: tmpId, Confirmed: true });
			return pNext();
		});

	// ── POST /api/manager/ripple/:id/cancel ──
	tmpOrator.serviceServer.doPost('/api/manager/ripple/:id/cancel',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			let tmpContext = _ripples.get(tmpId);
			if (!tmpContext)
			{
				respondError(pRes, 404, 'UnknownRipple', 'No ripple "' + tmpId + '".');
				return pNext();
			}
			tmpContext.Cancel = true;
			if (tmpContext.PendingConfirm)
			{
				let tmpReject = tmpContext.PendingConfirm.Reject;
				tmpContext.PendingConfirm = null;
				let tmpErr = new Error('cancelled');
				tmpErr.Code = 'RIPPLE_CANCELLED';
				tmpReject(tmpErr);
			}
			// Also kill any in-flight child process associated with this ripple.
			pCore.ProcessRunner.kill();
			pRes.send({ RippleId: tmpId, Cancelled: true });
			return pNext();
		});

	// ── GET /api/manager/ripple/:id ──
	tmpOrator.serviceServer.doGet('/api/manager/ripple/:id',
		function (pReq, pRes, pNext)
		{
			let tmpId = pReq.params.id;
			let tmpContext = _ripples.get(tmpId);
			if (!tmpContext)
			{
				respondError(pRes, 404, 'UnknownRipple', 'No ripple "' + tmpId + '".');
				return pNext();
			}
			pRes.send(rippleSummary(tmpContext));
			return pNext();
		});
};
