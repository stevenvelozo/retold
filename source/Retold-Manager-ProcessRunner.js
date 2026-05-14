/**
 * Retold Manager -- Process Runner (DEPRECATED location)
 *
 * The blessed-aware runner has been split into:
 *   - source/core/Manager-Core-ProcessRunner.js   (transport-agnostic, EventEmitter)
 *   - source/tui/Retold-Manager-BlessedRenderer.js (TUI-side consumer)
 *
 * This file is kept so that any legacy external imports keep working.
 * It exports a class with the old constructor signature
 *     new ProcessRunner(pLogWidget, pScreen, pStatusCallback, pLog)
 * and the old method surface (run/runSequence/kill/isRunning/search/etc),
 * internally delegating to the new core + renderer pair.
 */

const libCoreProcessRunner = require('./core/Manager-Core-ProcessRunner.js');
const libBlessedRenderer = require('./tui/Retold-Manager-BlessedRenderer.js');

class ProcessRunner extends libBlessedRenderer
{
	constructor(pLogWidget, pScreen, pStatusCallback, pLog)
	{
		let tmpCore = new libCoreProcessRunner({ log: pLog || null });
		super(tmpCore, pLogWidget, pScreen, pStatusCallback);
	}
}

module.exports = ProcessRunner;
