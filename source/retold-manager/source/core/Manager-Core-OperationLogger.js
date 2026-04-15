/**
 * Retold Manager -- Operation Logger
 *
 * Subscribes to a ProcessRunner's events and appends each one to a daily-
 * rolling log file in the repo root. Covers every op that runs through the
 * core — standalone TUI/web operations, individual ripple steps, the "all
 * modules" shell scripts — so there is a durable record of what happened
 * and why, independent of the server process or the browser.
 *
 * File format is plain text, one event per line, greppable:
 *
 *   [2026-04-15T18:25:36.123Z] START  op_xxx cwd=/.../mod   $ npm install
 *   [2026-04-15T18:25:36.456Z] out    op_xxx | added 342 packages
 *   [2026-04-15T18:25:38.789Z] err    op_xxx | npm ERR! code E404
 *   [2026-04-15T18:25:38.900Z] END    op_xxx exit=1  elapsed=2.4s
 *
 * In addition, ripple lifecycle events get their own RIPPLE lines so a
 * failed step in a cascade is unambiguously correlated to the ripple that
 * spawned it:
 *
 *   [ts] RIPPLE START  ripple_yyy root=meadow-connection-mssql target=1.0.18 steps=9
 *   [ts] RIPPLE STEP   ripple_yyy order=1 module=meadow-integration kind=consumer
 *   [ts] RIPPLE ACTION ripple_yyy order=1 idx=2 op=install
 *   [ts] RIPPLE FAIL   ripple_yyy order=1 idx=2 error=...
 *   [ts] RIPPLE END    ripple_yyy status=failed
 *
 * The logger never throws — if the log file can't be opened, it drops the
 * event and prints a single warning to the fable log.
 */

const libFs = require('fs');
const libPath = require('path');

function pad(pN, pWidth)
{
	return String(pN).padStart(pWidth || 2, '0');
}

function todayStamp(pDate)
{
	let tmpDate = pDate || new Date();
	return tmpDate.getFullYear() + '-' + pad(tmpDate.getMonth() + 1) + '-' + pad(tmpDate.getDate());
}

function fmtTs(pDate)
{
	return (pDate || new Date()).toISOString();
}

class OperationLogger
{
	/**
	 * @param {object} pOptions
	 * @param {string} pOptions.RepoRoot  Absolute path to the retold repo root (log lands here).
	 * @param {ProcessRunner} [pOptions.ProcessRunner] Core runner to subscribe to.
	 * @param {object} [pOptions.Log]  Fable log (optional).
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.repoRoot = tmpOptions.RepoRoot;
		this.log = tmpOptions.Log || null;

		this._currentDay = null;
		this._stream = null;
		this._streamPath = null;
		this._warnedAboutOpenFailure = false;

		// Track short op metadata so we can emit richer END lines.
		this._opMeta = new Map();

		if (tmpOptions.ProcessRunner)
		{
			this.attach(tmpOptions.ProcessRunner);
		}
	}

	// ─────────────────────────────────────────────
	//  File management
	// ─────────────────────────────────────────────

	_currentLogPath()
	{
		return libPath.join(this.repoRoot,
			'Retold-Manager-Operations-' + todayStamp() + '.log');
	}

	_ensureStream()
	{
		let tmpDay = todayStamp();
		if (this._stream && this._currentDay === tmpDay) { return this._stream; }

		// Rollover or first open
		if (this._stream)
		{
			try { this._stream.end(); } catch (pError) { /* ignore */ }
			this._stream = null;
		}

		let tmpPath = this._currentLogPath();
		try
		{
			this._stream = libFs.createWriteStream(tmpPath, { flags: 'a', encoding: 'utf8' });
			this._currentDay = tmpDay;
			this._streamPath = tmpPath;
			this._warnedAboutOpenFailure = false;
		}
		catch (pError)
		{
			if (!this._warnedAboutOpenFailure && this.log)
			{
				this.log.warn('OperationLogger: could not open ' + tmpPath + ': ' + pError.message);
				this._warnedAboutOpenFailure = true;
			}
			this._stream = null;
		}
		return this._stream;
	}

	_write(pLine)
	{
		let tmpStream = this._ensureStream();
		if (!tmpStream) { return; }
		try { tmpStream.write(pLine + '\n'); }
		catch (pError) { /* swallow */ }
	}

	/**
	 * Return the current log file path (may be null if not yet opened).
	 */
	getLogPath()
	{
		return this._streamPath || this._currentLogPath();
	}

	close()
	{
		if (this._stream)
		{
			try { this._stream.end(); } catch (pError) { /* ignore */ }
			this._stream = null;
		}
	}

	// ─────────────────────────────────────────────
	//  Hookup
	// ─────────────────────────────────────────────

	attach(pRunner)
	{
		if (!pRunner || pRunner._loggerAttached === this) { return; }
		pRunner._loggerAttached = this;

		let tmpSelf = this;
		pRunner.on('start', (pEvent) =>
			{
				tmpSelf._opMeta.set(pEvent.OperationId,
					{
						CommandString: pEvent.CommandString,
						Cwd: pEvent.Cwd,
						Label: pEvent.Label,
						StartedAt: pEvent.StartedAt,
					});
				tmpSelf._write('[' + fmtTs() + '] START  ' + pEvent.OperationId
					+ '  cwd=' + pEvent.Cwd
					+ (pEvent.Label ? '  label=' + JSON.stringify(pEvent.Label) : '')
					+ '  $ ' + pEvent.CommandString);
			});

		pRunner.on('line', (pEvent) =>
			{
				let tmpChannel = (pEvent.Channel === 'stderr') ? 'err   ' : 'out   ';
				tmpSelf._write('[' + fmtTs() + '] ' + tmpChannel + ' ' + pEvent.OperationId + ' | ' + pEvent.Text);
			});

		pRunner.on('end', (pEvent) =>
			{
				tmpSelf._write('[' + fmtTs() + '] END    ' + pEvent.OperationId
					+ '  exit=' + pEvent.ExitCode
					+ '  elapsed=' + (pEvent.Duration || (pEvent.ElapsedMs + 'ms'))
					+ '  lines=' + pEvent.LineCount
					+ (pEvent.IsLastStep ? '' : '  step=' + (pEvent.StepIndex + 1) + '/' + pEvent.TotalSteps));
				if (pEvent.IsLastStep) { tmpSelf._opMeta.delete(pEvent.OperationId); }
			});

		pRunner.on('error', (pEvent) =>
			{
				tmpSelf._write('[' + fmtTs() + '] ERROR  ' + pEvent.OperationId
					+ '  elapsed=' + (pEvent.Duration || (pEvent.ElapsedMs + 'ms'))
					+ '  message=' + JSON.stringify(pEvent.Message || 'unknown'));
				tmpSelf._opMeta.delete(pEvent.OperationId);
			});
	}

	// ─────────────────────────────────────────────
	//  Explicit ripple-level event helpers
	// ─────────────────────────────────────────────

	ripple(pMessage)
	{
		this._write('[' + fmtTs() + '] RIPPLE ' + pMessage);
	}

	rippleStart(pRippleId, pPlan)
	{
		this.ripple('START  ' + pRippleId
			+ '  root=' + pPlan.Root
			+ '  target=' + pPlan.TargetVersion
			+ '  steps=' + pPlan.Steps.length
			+ (pPlan.Options && pPlan.Options.BringRetoldDepsForward ? '  bring-forward=true' : ''));
	}

	rippleStep(pRippleId, pStep)
	{
		this.ripple('STEP   ' + pRippleId
			+ '  order=' + (pStep.Order + 1)
			+ '  module=' + pStep.Module
			+ '  kind=' + pStep.Kind);
	}

	rippleAction(pRippleId, pStepOrder, pActionIdx, pAction)
	{
		this.ripple('ACTION ' + pRippleId
			+ '  order=' + (pStepOrder + 1)
			+ '  idx=' + pActionIdx
			+ '  op=' + pAction.Op
			+ (pAction.Dep ? '  dep=' + pAction.Dep : '')
			+ (pAction.Kind ? '  kind=' + pAction.Kind : ''));
	}

	ripplePaused(pRippleId, pStepOrder, pReport)
	{
		this.ripple('PAUSE  ' + pRippleId
			+ '  order=' + (pStepOrder + 1)
			+ '  module=' + pReport.Package
			+ '  local=' + pReport.LocalVersion
			+ '  npm=' + (pReport.PublishedVersion || '(new)')
			+ '  ok=' + pReport.OkToPublish);
	}

	rippleFail(pRippleId, pStepOrder, pActionIdx, pError)
	{
		this.ripple('FAIL   ' + pRippleId
			+ '  order=' + (pStepOrder + 1)
			+ '  idx=' + pActionIdx
			+ '  error=' + JSON.stringify(pError && pError.message ? pError.message : String(pError)));
	}

	rippleEnd(pRippleId, pStatus)
	{
		this.ripple('END    ' + pRippleId + '  status=' + pStatus);
	}
}

module.exports = OperationLogger;
