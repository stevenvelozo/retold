#!/usr/bin/env node
/**
 * Retold Manager -- Terminal UI for Module Management
 *
 * A pict-terminalui application for browsing the retold module suite
 * and running common operations (install, test, build, version, diff).
 *
 * Run:   node retold-manager.js
 * Quit:  Ctrl-C
 */

// Suppress blessed's Setulc stderr noise before anything loads
const _origStderrWrite = process.stderr.write;
process.stderr.write = function (pChunk)
{
	if (typeof pChunk === 'string' && pChunk.indexOf('Setulc') !== -1)
	{
		return true;
	}
	return _origStderrWrite.apply(process.stderr, arguments);
};

const libPict = require('pict');
const libPictApplication = require('pict-application');

const libRetoldManagerApp = require('./source/Retold-Manager-App.js');

// ─────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────
let _Pict = new libPict(
	{
		Product: 'RetoldManager',
		LogNoisiness: 0,
		// Silence the default console log stream so it doesn't corrupt the
		// blessed TUI.  File logging is added dynamically via [l] toggle.
		LogStreams:
		[
			{
				loggertype: 'console',
				streamtype: 'console',
				level: 'fatal',
				outputloglinestoconsole: false,
				outputobjectstoconsole: false,
			}
		],
	});

let _App = _Pict.addApplication('RetoldManager',
	{
		Name: 'RetoldManager',
		MainViewportViewIdentifier: 'TUI-Layout',
		AutoRenderMainViewportViewAfterInitialize: false,
		AutoSolveAfterInitialize: false,
	}, libRetoldManagerApp);

_App.initializeAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('Application initialization failed:', pError);
			process.exit(1);
		}
	});
