#!/usr/bin/env node
/**
 * Retold Manager -- Entry point
 *
 *   npx manager               -> blessed terminal UI (default)
 *   npx manager --web         -> Orator web server on 127.0.0.1:44444,
 *                                auto-opens the browser
 *   npx manager --web --port 5555
 *   npx manager --web --no-open
 *
 * The dispatch happens before anything else loads so that the blessed
 * setup (which takes over the terminal) is only reached in TUI mode.
 */

const tmpArgs = process.argv.slice(2);
const tmpWebMode = tmpArgs.indexOf('--web') !== -1;

if (tmpWebMode)
{
	require('./retold-manager-web.js');
	return;
}

// ─────────────────────────────────────────────
//  TUI bootstrap (default)
// ─────────────────────────────────────────────

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
