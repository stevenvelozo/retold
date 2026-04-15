#!/usr/bin/env node
/**
 * Retold Manager -- Web entry point (invoked by `npx manager --web`)
 *
 * Parses argv, composes the Orator server via Manager-Server-Setup, and
 * optionally auto-opens the user's default browser.
 */

const libPath = require('path');
const libChildProcess = require('child_process');

const libServerSetup = require('./source/web/server/Manager-Server-Setup.js');

// ─────────────────────────────────────────────
//  argv
// ─────────────────────────────────────────────

function parseArgs(pArgv)
{
	let tmpArgs =
		{
			Port: 44444,
			Open: true,
			Host: '127.0.0.1',
		};

	for (let i = 0; i < pArgv.length; i++)
	{
		let tmpArg = pArgv[i];
		if (tmpArg === '--web') { continue; }
		if (tmpArg === '--port')
		{
			tmpArgs.Port = parseInt(pArgv[++i], 10);
			continue;
		}
		if (tmpArg.startsWith('--port='))
		{
			tmpArgs.Port = parseInt(tmpArg.slice(7), 10);
			continue;
		}
		if (tmpArg === '--host')
		{
			tmpArgs.Host = pArgv[++i];
			continue;
		}
		if (tmpArg === '--no-open')
		{
			tmpArgs.Open = false;
			continue;
		}
		if (tmpArg === '--open')
		{
			tmpArgs.Open = true;
			continue;
		}
		if (tmpArg === '--help' || tmpArg === '-h')
		{
			printHelp();
			process.exit(0);
		}
	}

	if (!Number.isFinite(tmpArgs.Port) || tmpArgs.Port < 1 || tmpArgs.Port > 65535)
	{
		console.error('Invalid --port value.');
		process.exit(2);
	}

	return tmpArgs;
}

function printHelp()
{
	console.log('npx manager --web    Start the Retold Manager web UI.');
	console.log('');
	console.log('Options:');
	console.log('  --port <N>    Bind to port N (default: 44444).');
	console.log('  --host <ADDR> Bind to interface ADDR (default: 127.0.0.1).');
	console.log('  --no-open     Do not auto-open the browser.');
	console.log('  --open        Auto-open the browser (default).');
	console.log('  --help, -h    Print this help.');
}

// ─────────────────────────────────────────────
//  Browser auto-open
// ─────────────────────────────────────────────

function openBrowser(pUrl)
{
	let tmpCommand;
	switch (process.platform)
	{
		case 'darwin': tmpCommand = `open "${pUrl}"`; break;
		case 'win32':  tmpCommand = `start "" "${pUrl}"`; break;
		default:       tmpCommand = `xdg-open "${pUrl}"`; break;
	}
	libChildProcess.exec(tmpCommand, function (pError)
		{
			// Non-fatal — user can click the URL printed to stdout instead.
			if (pError) { console.error('Could not auto-open browser:', pError.message); }
		});
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

const _args = parseArgs(process.argv.slice(2));

libServerSetup(
	{
		Port: _args.Port,
		Host: _args.Host,
		DistPath: libPath.join(__dirname, 'web-application'),
	},
	function (pError, pServerInfo)
	{
		if (pError)
		{
			console.error('Failed to start Retold Manager web server:', pError.message);
			process.exit(1);
		}

		let tmpUrl = `http://${pServerInfo.Host}:${pServerInfo.Port}/`;
		console.log('');
		console.log('  Retold Manager Web');
		console.log('  ' + tmpUrl);
		console.log('  ' + pServerInfo.ModuleCount + ' modules loaded from the manifest');
		console.log('');
		console.log('  Ctrl-C to stop.');
		console.log('');

		if (_args.Open)
		{
			openBrowser(tmpUrl);
		}
	});
