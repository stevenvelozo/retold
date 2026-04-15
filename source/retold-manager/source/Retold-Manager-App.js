/**
 * Retold Manager -- Main Application
 *
 * A pict-terminalui application for managing the retold module suite.
 * Provides a file browser for navigating module groups and a terminal
 * output area for running npm/git operations.
 */

const blessed = require('blessed');
const libFs = require('fs');
const libPath = require('path');

const libPictApplication = require('pict-application');
const libPictTerminalUI = require('pict-terminalui');

const libModuleCatalog = require('./Retold-Manager-ModuleCatalog.js');
const libCoreProcessRunner = require('./core/Manager-Core-ProcessRunner.js');
const libBlessedRenderer = require('./tui/Retold-Manager-BlessedRenderer.js');
const libCommitComposer = require('./core/Manager-Core-CommitComposer.js');
const libModuleIntrospector = require('./core/Manager-Core-ModuleIntrospector.js');
const libPrePublishValidator = require('./core/Manager-Core-PrePublishValidator.js');

// Views
const libViewLayout = require('./views/PictView-TUI-Layout.js');
const libViewHeader = require('./views/PictView-TUI-Header.js');
const libViewStatusBar = require('./views/PictView-TUI-StatusBar.js');
const libViewStatus = require('./views/PictView-TUI-Status.js');
const libViewUpdate = require('./views/PictView-TUI-Update.js');
const libViewCheckout = require('./views/PictView-TUI-Checkout.js');

// Maximum lines to display when viewing a file
const FILE_VIEW_LINE_LIMIT = 500;

class RetoldManagerApp extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.terminalUI = null;
		this.processRunner = null;

		// Blessed widget references for direct manipulation
		this._fileBrowser = null;
		this._terminalOutput = null;
		this._screen = null;

		// Register views
		this.pict.addView('TUI-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('TUI-Header', libViewHeader.default_configuration, libViewHeader);
		this.pict.addView('TUI-StatusBar', libViewStatusBar.default_configuration, libViewStatusBar);
		this.pict.addView('TUI-Status', libViewStatus.default_configuration, libViewStatus);
		this.pict.addView('TUI-Update', libViewUpdate.default_configuration, libViewUpdate);
		this.pict.addView('TUI-Checkout', libViewCheckout.default_configuration, libViewCheckout);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Initialize shared application state
		this.pict.AppData.Manager =
		{
			AppName: 'Retold Manager',
			AppVersion: '0.0.1',
			StatusMessage: 'Ready',

			Browser:
			{
				Level: 'groups',
				GroupIndex: -1,
				GroupName: '',
				GroupLabel: '',
				ModuleName: '',
				ModulePath: '',
				SubPath: '',
				CurrentPath: 'retold/modules/',
			},
		};

		// Create the terminal UI environment
		this.terminalUI = new libPictTerminalUI(this.pict,
			{
				Title: 'Retold Manager'
			});

		// Create the blessed screen
		let tmpScreen = this.terminalUI.createScreen();

		// Build the blessed widget layout
		this._createBlessedLayout(tmpScreen);

		// Create the core (transport-agnostic) ProcessRunner, then wrap it
		// in the BlessedRenderer that reproduces the TUI's widget behavior.
		// Downstream code keeps calling this.processRunner.run() / .kill() /
		// .search() etc. against the renderer, which delegates to core.
		this._coreProcessRunner = new libCoreProcessRunner({ log: this.pict.log });
		this.processRunner = new libBlessedRenderer(
			this._coreProcessRunner,
			this._terminalOutput,
			this._screen,
			(pState, pMessage) =>
			{
				this._updateStatus(pMessage);
			});

		// Introspector + validator share a single manifest instance (libModuleCatalog.manifest).
		this._introspector = new libModuleIntrospector(
			{
				manifest: libModuleCatalog,
				log: this.pict.log,
			});
		this._prePublishValidator = new libPrePublishValidator(
			{
				introspector: this._introspector,
				log: this.pict.log,
			});

		// File logging state -- the stream reference when active, null when off
		this._fileLogStream = null;

		// When true, a Y/N confirmation prompt is active -- suppress other key handlers
		this._awaitingConfirmation = false;

		// Bind navigation keys
		this._bindNavigation(tmpScreen);

		// Enable file logging by default
		this._toggleFileLogging();

		// Populate the initial file list (groups)
		this._populateFileList();

		// Render the layout view (triggers Header + StatusBar)
		this.pict.views['TUI-Layout'].render();

		// Do the initial blessed screen render
		tmpScreen.render();

		// Focus the file browser
		this._fileBrowser.focus();

		return super.onAfterInitializeAsync(fCallback);
	}

	// ─────────────────────────────────────────────
	//  Widget Layout
	// ─────────────────────────────────────────────

	_createBlessedLayout(pScreen)
	{
		this._screen = pScreen;

		// Application container
		let tmpAppContainer = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
			});
		this.terminalUI.registerWidget('#TUI-Application-Container', tmpAppContainer);

		// Header bar -- 2 lines high
		let tmpHeader = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: 2,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'blue',
					bold: true,
				},
			});
		this.terminalUI.registerWidget('#TUI-Header', tmpHeader);

		// File browser list -- left side, max 40 chars wide
		this._fileBrowser = blessed.list(
			{
				parent: pScreen,
				top: 2,
				left: 0,
				width: 40,
				bottom: 1,
				items: [],
				keys: true,
				vi: true,
				mouse: true,
				border: { type: 'line' },
				label: ' Module Groups ',
				scrollbar:
				{
					style: { bg: 'blue' },
				},
				style:
				{
					fg: 'white',
					bg: 'black',
					selected: { fg: 'black', bg: 'cyan', bold: true },
					item: { fg: 'white' },
					border: { fg: 'cyan' },
					label: { fg: 'cyan', bold: true },
				},
			});
		this.terminalUI.registerWidget('#TUI-FileBrowser', this._fileBrowser);

		// Terminal output log -- right side
		this._terminalOutput = blessed.log(
			{
				parent: pScreen,
				top: 2,
				left: 40,
				right: 0,
				bottom: 1,
				label: ' Terminal Output ',
				border: { type: 'line' },
				tags: true,
				scrollable: true,
				scrollOnInput: true,
				mouse: true,
				scrollback: 2000,
				scrollbar:
				{
					style: { bg: 'green' },
				},
				style:
				{
					fg: 'white',
					bg: 'black',
					border: { fg: 'green' },
					label: { fg: 'green', bold: true },
				},
			});
		this.terminalUI.registerWidget('#TUI-TerminalOutput', this._terminalOutput);

		// Status bar -- bottom 1 line
		let tmpStatusBar = blessed.box(
			{
				parent: pScreen,
				bottom: 0,
				left: 0,
				width: '100%',
				height: 1,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'gray',
				},
			});
		this.terminalUI.registerWidget('#TUI-StatusBar', tmpStatusBar);
	}

	// ─────────────────────────────────────────────
	//  File Browser Navigation
	// ─────────────────────────────────────────────

	_populateFileList()
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;
		let tmpItems = [];

		switch (tmpBrowser.Level)
		{
			case 'groups':
			{
				for (let i = 0; i < libModuleCatalog.Groups.length; i++)
				{
					let tmpGroup = libModuleCatalog.Groups[i];
					tmpItems.push(`  ${tmpGroup.Label}/  (${tmpGroup.Modules.length} modules) -- ${tmpGroup.Description}`);
				}
				this._fileBrowser.setLabel(' Module Groups ');
				tmpBrowser.CurrentPath = 'retold/modules/';
				break;
			}

			case 'modules':
			{
				let tmpGroupPath = libPath.join(libModuleCatalog.BasePath, tmpBrowser.GroupName);
				let tmpEntries = [];

				try
				{
					let tmpRawEntries = libFs.readdirSync(tmpGroupPath);
					for (let i = 0; i < tmpRawEntries.length; i++)
					{
						let tmpEntryPath = libPath.join(tmpGroupPath, tmpRawEntries[i]);
						try
						{
							let tmpStat = libFs.statSync(tmpEntryPath);
							if (tmpStat.isDirectory() && !tmpRawEntries[i].startsWith('.'))
							{
								tmpEntries.push(tmpRawEntries[i]);
							}
						}
						catch (pError)
						{
							// Skip entries we can't stat
						}
					}
				}
				catch (pError)
				{
					this._terminalOutput.log(`{red-fg}Error reading directory: ${pError.message}{/red-fg}`);
				}

				tmpEntries.sort();

				tmpItems.push('  ../');
				for (let i = 0; i < tmpEntries.length; i++)
				{
					tmpItems.push(`  ${tmpEntries[i]}/`);
				}

				this._fileBrowser.setLabel(` ${tmpBrowser.GroupName}/ `);
				tmpBrowser.CurrentPath = `retold/modules/${tmpBrowser.GroupName}/`;
				break;
			}

			case 'files':
			{
				let tmpBrowsePath = tmpBrowser.SubPath
					? libPath.join(tmpBrowser.ModulePath, tmpBrowser.SubPath)
					: tmpBrowser.ModulePath;
				let tmpEntries = [];

				try
				{
					let tmpRawEntries = libFs.readdirSync(tmpBrowsePath);
					for (let i = 0; i < tmpRawEntries.length; i++)
					{
						if (tmpRawEntries[i].startsWith('.') && tmpRawEntries[i] !== '.gitignore')
						{
							continue;
						}
						if (tmpRawEntries[i] === 'node_modules')
						{
							continue;
						}

						let tmpEntryPath = libPath.join(tmpBrowsePath, tmpRawEntries[i]);
						try
						{
							let tmpStat = libFs.statSync(tmpEntryPath);
							if (tmpStat.isDirectory())
							{
								tmpEntries.push(tmpRawEntries[i] + '/');
							}
							else
							{
								tmpEntries.push(tmpRawEntries[i]);
							}
						}
						catch (pError)
						{
							tmpEntries.push(tmpRawEntries[i]);
						}
					}
				}
				catch (pError)
				{
					this._terminalOutput.log(`{red-fg}Error reading directory: ${pError.message}{/red-fg}`);
				}

				tmpEntries.sort((a, b) =>
				{
					// Directories first, then files
					let tmpAIsDir = a.endsWith('/');
					let tmpBIsDir = b.endsWith('/');
					if (tmpAIsDir && !tmpBIsDir) return -1;
					if (!tmpAIsDir && tmpBIsDir) return 1;
					return a.localeCompare(b);
				});

				tmpItems.push('  ../');
				for (let i = 0; i < tmpEntries.length; i++)
				{
					tmpItems.push(`  ${tmpEntries[i]}`);
				}

				let tmpLabelSuffix = tmpBrowser.SubPath ? `${tmpBrowser.SubPath}/` : '';
				this._fileBrowser.setLabel(` ${tmpBrowser.ModuleName}/${tmpLabelSuffix} `);
				tmpBrowser.CurrentPath = tmpBrowser.SubPath
					? `retold/modules/${tmpBrowser.GroupName}/${tmpBrowser.ModuleName}/${tmpBrowser.SubPath}/`
					: `retold/modules/${tmpBrowser.GroupName}/${tmpBrowser.ModuleName}/`;
				break;
			}
		}

		this._fileBrowser.setItems(tmpItems);
		this._fileBrowser.select(0);

		this._updateHeader();
		this._updateStatus(this.pict.AppData.Manager.StatusMessage);
		this._screen.render();
	}

	_drillIn(pIndex)
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;

		switch (tmpBrowser.Level)
		{
			case 'groups':
			{
				if (pIndex < 0 || pIndex >= libModuleCatalog.Groups.length)
				{
					return;
				}
				let tmpGroup = libModuleCatalog.Groups[pIndex];
				tmpBrowser.GroupIndex = pIndex;
				tmpBrowser.GroupName = tmpGroup.Name;
				tmpBrowser.GroupLabel = tmpGroup.Label;
				tmpBrowser.Level = 'modules';
				this._populateFileList();
				break;
			}

			case 'modules':
			{
				// Index 0 is '../'
				if (pIndex === 0)
				{
					this._drillOut();
					return;
				}

				// Get the module name from the list item text
				let tmpItemText = this._fileBrowser.getItem(pIndex).getText().trim();
				let tmpModuleName = tmpItemText.replace(/\/$/, '');

				tmpBrowser.ModuleName = tmpModuleName;
				tmpBrowser.ModulePath = libPath.join(libModuleCatalog.BasePath, tmpBrowser.GroupName, tmpModuleName);
				tmpBrowser.SubPath = '';
				tmpBrowser.Level = 'files';

				this._populateFileList();
				this._showModuleWelcome();
				break;
			}

			case 'files':
			{
				// Index 0 is '../'
				if (pIndex === 0)
				{
					this._drillOut();
					return;
				}

				let tmpItemText = this._fileBrowser.getItem(pIndex).getText().trim();
				let tmpBrowsePath = tmpBrowser.SubPath
					? libPath.join(tmpBrowser.ModulePath, tmpBrowser.SubPath)
					: tmpBrowser.ModulePath;

				if (tmpItemText.endsWith('/'))
				{
					// It's a subdirectory -- navigate into it
					let tmpSubdir = tmpItemText.replace(/\/$/, '');
					tmpBrowser.SubPath = tmpBrowser.SubPath
						? libPath.join(tmpBrowser.SubPath, tmpSubdir)
						: tmpSubdir;
					this._populateFileList();
				}
				else
				{
					// It's a file -- show its contents
					let tmpFilePath = libPath.join(tmpBrowsePath, tmpItemText);
					this._showFileContents(tmpFilePath, tmpItemText);
				}
				break;
			}
		}
	}

	_drillOut()
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;

		switch (tmpBrowser.Level)
		{
			case 'files':
			{
				if (tmpBrowser.SubPath)
				{
					// We're in a subfolder -- go up one level within the module
					let tmpParent = libPath.dirname(tmpBrowser.SubPath);
					tmpBrowser.SubPath = (tmpParent === '.') ? '' : tmpParent;
					this._populateFileList();
				}
				else
				{
					// We're at the module root -- go back to module list
					tmpBrowser.ModuleName = '';
					tmpBrowser.ModulePath = '';
					tmpBrowser.SubPath = '';
					tmpBrowser.Level = 'modules';
					this._populateFileList();
				}
				break;
			}

			case 'modules':
			{
				tmpBrowser.GroupIndex = -1;
				tmpBrowser.GroupName = '';
				tmpBrowser.GroupLabel = '';
				tmpBrowser.Level = 'groups';
				this._populateFileList();
				break;
			}

			case 'groups':
			{
				// Already at top -- no-op
				break;
			}
		}
	}

	// ─────────────────────────────────────────────
	//  Module Operations
	// ─────────────────────────────────────────────

	_getModulePath()
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;

		// If we're inside a module's files, use its path
		if (tmpBrowser.Level === 'files' && tmpBrowser.ModulePath)
		{
			return tmpBrowser.ModulePath;
		}

		// If we're at the module list level, use the highlighted module
		if (tmpBrowser.Level === 'modules')
		{
			let tmpSelected = this._fileBrowser.selected;
			if (tmpSelected > 0) // Skip '../' at index 0
			{
				let tmpItemText = this._fileBrowser.getItem(tmpSelected).getText().trim();
				let tmpModuleName = tmpItemText.replace(/\/$/, '');
				return libPath.join(libModuleCatalog.BasePath, tmpBrowser.GroupName, tmpModuleName);
			}
		}

		return null;
	}

	_runModuleOperation(pCommand, pArgs, pLineLimit)
	{
		if (this._awaitingConfirmation) { return; }

		let tmpModulePath = this._getModulePath();

		if (!tmpModulePath)
		{
			this._terminalOutput.setContent('');
			this._terminalOutput.log('{yellow-fg}{bold}Select a module first.{/bold}{/yellow-fg}');
			this._terminalOutput.log('');
			this._terminalOutput.log('Navigate into a module group, then select or enter a module');
			this._terminalOutput.log('before running operations.');
			this._screen.render();
			return;
		}

		this.processRunner.run(pCommand, pArgs, tmpModulePath, pLineLimit);
	}

	_runDiff()
	{
		if (this._awaitingConfirmation) { return; }

		let tmpModulePath = this._getModulePath();

		if (!tmpModulePath)
		{
			this._terminalOutput.setContent('');
			this._terminalOutput.log('{yellow-fg}{bold}Select a module first.{/bold}{/yellow-fg}');
			this._terminalOutput.log('');
			this._terminalOutput.log('Navigate into a module group, then select or enter a module');
			this._terminalOutput.log('before running operations.');
			this._screen.render();
			return;
		}

		this.processRunner.runSequence(
			[
				{
					command: 'git',
					args: ['diff', '--stat'],
					label: 'Changed files overview (including dist/):'
				},
				{
					command: 'git',
					args: ['diff', '--', '.', ':!dist'],
					label: 'Full diff (excluding dist/):'
				}
			],
			tmpModulePath);
	}

	/**
	 * Run npm-check-updates in the selected module, optionally applying updates.
	 * Mirrors the web UI's NCU modal. When Scope='retold', the --filter argument
	 * restricts npm-check-updates to ecosystem modules only.
	 */
	_runNcu(pOptions)
	{
		if (this._awaitingConfirmation) { return; }

		let tmpOptions = pOptions || {};
		let tmpApply = !!tmpOptions.Apply;
		let tmpScope = tmpOptions.Scope === 'all' ? 'all' : 'retold';

		let tmpModulePath = this._getModulePath();
		if (!tmpModulePath)
		{
			this._terminalOutput.setContent('');
			this._terminalOutput.log('{yellow-fg}{bold}Select a module first.{/bold}{/yellow-fg}');
			this._terminalOutput.log('');
			this._terminalOutput.log('Navigate into a module group, then select or enter a module');
			this._terminalOutput.log('before running operations.');
			this._screen.render();
			return;
		}

		let tmpArgs = [];
		if (tmpApply) { tmpArgs.push('-u'); }
		if (tmpScope === 'retold')
		{
			let tmpEcosystem = libModuleCatalog.getAllModuleNames();
			tmpArgs.push('--filter');
			tmpArgs.push(tmpEcosystem.join(','));
		}

		if (!tmpApply)
		{
			this.processRunner.run('npx', ['npm-check-updates'].concat(tmpArgs), tmpModulePath);
			return;
		}

		// Apply path: confirmation prompt + runSequence(ncu -u, npm install)
		this._terminalOutput.setContent('');
		this._terminalOutput.log('{bold}{yellow-fg}npm-check-updates — apply (scope: ' + tmpScope + '){/yellow-fg}{/bold}');
		this._terminalOutput.log('');
		this._terminalOutput.log('This will update package.json with latest ' + (tmpScope === 'retold' ? 'retold ecosystem' : 'all') + ' dep versions,');
		this._terminalOutput.log('then run {bold}npm install{/bold} to refresh node_modules and package-lock.json.');
		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}{yellow-fg}Apply updates?  [Y] yes  [N] no{/yellow-fg}{/bold}');
		this._updateStatus('Apply ncu updates? Y/N');
		this._awaitingConfirmation = true;
		this._screen.render();

		let tmpSelf = this;
		let tmpConfirmHandler = function (pCh)
		{
			tmpSelf._screen.removeListener('keypress', tmpConfirmHandler);
			tmpSelf._awaitingConfirmation = false;

			if (pCh === 'y' || pCh === 'Y')
			{
				tmpSelf.processRunner.runSequence(
					[
						{
							command: 'npx',
							args: ['npm-check-updates'].concat(tmpArgs),
							label: 'ncu -u (scope: ' + tmpScope + ')',
						},
						{
							command: 'npm',
							args: ['install'],
							label: 'npm install (after ncu -u)',
						}
					],
					tmpModulePath);
			}
			else
			{
				tmpSelf._terminalOutput.log('');
				tmpSelf._terminalOutput.log('{yellow-fg}{bold}ncu apply cancelled.{/bold}{/yellow-fg}');
				tmpSelf._updateStatus('ncu apply cancelled');
				tmpSelf._screen.render();
			}
		};
		this._screen.on('keypress', tmpConfirmHandler);
	}

	_runPublish()
	{
		if (this._awaitingConfirmation) { return; }

		let tmpModulePath = this._getModulePath();

		if (!tmpModulePath)
		{
			this._terminalOutput.setContent('');
			this._terminalOutput.log('{yellow-fg}{bold}Select a module first.{/bold}{/yellow-fg}');
			this._terminalOutput.log('');
			this._terminalOutput.log('Navigate into a module group, then select or enter a module');
			this._terminalOutput.log('before running operations.');
			this._screen.render();
			return;
		}

		// Clear and write the "we're validating" header so the user sees
		// instant feedback while the async validation runs.
		this._terminalOutput.setContent('');
		this._terminalOutput.log('{bold}{yellow-fg}Pre-publish validation{/yellow-fg}{/bold}');
		this._terminalOutput.log('');
		this._terminalOutput.log('{gray-fg}  running npm queries (parallel)...{/gray-fg}');
		this._updateStatus('Pre-publish validation running...');
		this._screen.render();

		if (this.pict.log)
		{
			this.pict.log.info(`PUBLISH  Pre-publish validation for ${tmpModulePath}`);
		}

		let tmpModuleName = libPath.basename(tmpModulePath);

		this._prePublishValidator.validate(tmpModuleName).then(
			(pReport) =>
			{
				this._onPrePublishReport(pReport, tmpModulePath, tmpModuleName);
			},
			(pError) =>
			{
				this._terminalOutput.log('');
				this._terminalOutput.log(`{red-fg}{bold}Validator error:{/bold} ${pError.message}{/red-fg}`);
				this._updateStatus('Validation failed');
				this._screen.render();
			});
	}

	/**
	 * Consume a PrePublishValidator report, render it into the blessed
	 * widget (byte-identical to the pre-refactor output), and either
	 * abort or prompt for Y/N confirmation.
	 */
	_onPrePublishReport(pReport, pModulePath, pModuleName)
	{
		// Clear the "running..." placeholder and render the final report
		this._terminalOutput.setContent('');
		this._terminalOutput.log('{bold}{yellow-fg}Pre-publish validation{/yellow-fg}{/bold}');
		this._terminalOutput.log('');

		// Package / versions
		this._terminalOutput.log(`{bold}Package:{/bold}  ${pReport.Package}`);
		this._terminalOutput.log(`{bold}Local:{/bold}    v${pReport.LocalVersion}`);

		let tmpVersionMatch = pReport.Problems.some((pP) => pP.Code === 'version-already-published');

		if (pReport.PublishedVersion)
		{
			this._terminalOutput.log(`{bold}npm:{/bold}      v${pReport.PublishedVersion}`);
			if (tmpVersionMatch)
			{
				this._terminalOutput.log('');
				this._terminalOutput.log('{red-fg}{bold}✗ Version mismatch:{/bold} local version matches what is already published on npm.{/red-fg}');
				this._terminalOutput.log('{red-fg}  Bump the version with [v] before publishing.{/red-fg}');
				this._terminalOutput.log('');
				this._terminalOutput.log('{bold}────────────────────────────────────────{/bold}');
				this._terminalOutput.log('{red-fg}{bold}✗ Publish aborted{/bold}{/red-fg}');
				if (this.pict.log)
				{
					this.pict.log.info(`PUBLISH  Aborted ${pReport.Package} -- v${pReport.LocalVersion} already on npm`);
				}
				this._updateStatus(`Publish aborted -- version ${pReport.LocalVersion} already on npm`);
				this._screen.render();
				return;
			}
			this._terminalOutput.log(`{green-fg}  ✓ Local version differs from published{/green-fg}`);
		}
		else
		{
			this._terminalOutput.log('{bold}npm:{/bold}      {gray-fg}(not yet published){/gray-fg}');
			this._terminalOutput.log(`{green-fg}  ✓ First publish{/green-fg}`);
		}

		this._terminalOutput.log('');

		// Ecosystem deps
		if (pReport.EcosystemDeps.length === 0)
		{
			this._terminalOutput.log('{gray-fg}No retold ecosystem dependencies found.{/gray-fg}');
		}
		else
		{
			this._terminalOutput.log(`{bold}Ecosystem dependency check{/bold}  (${pReport.EcosystemDeps.length} packages)`);
			this._terminalOutput.log('');
			for (let i = 0; i < pReport.EcosystemDeps.length; i++)
			{
				this._terminalOutput.log(this._formatEcosystemDepLine(pReport.EcosystemDeps[i]));
			}
		}

		this._terminalOutput.log('');

		let tmpHasStaleDeps = pReport.Problems.some((pP) => pP.Code === 'ecosystem-dep-stale');
		if (tmpHasStaleDeps)
		{
			this._terminalOutput.log('{red-fg}{bold}✗ Ecosystem dependencies are out of date.{/bold}{/red-fg}');
			this._terminalOutput.log('{red-fg}  Update package.json and run [i]nstall before publishing.{/red-fg}');
			this._terminalOutput.log('');
			this._terminalOutput.log('{bold}────────────────────────────────────────{/bold}');
			this._terminalOutput.log('{red-fg}{bold}✗ Publish aborted{/bold}{/red-fg}');
			if (this.pict.log)
			{
				this.pict.log.info(`PUBLISH  Aborted ${pReport.Package} -- ecosystem deps out of date`);
			}
			this._updateStatus('Publish aborted -- ecosystem deps out of date');
			this._screen.render();
			return;
		}

		// All checks passed — summary + confirmation prompt
		this._terminalOutput.log('{green-fg}{bold}✓ All pre-publish checks passed{/bold}{/green-fg}');
		this._terminalOutput.log('');

		this._terminalOutput.log('{bold}Recent commits:{/bold}');
		this._terminalOutput.log('');
		if (pReport.CommitsSincePublish.length === 0)
		{
			this._terminalOutput.log('  {gray-fg}(no commits found){/gray-fg}');
		}
		else
		{
			for (let i = 0; i < pReport.CommitsSincePublish.length; i++)
			{
				let tmpCommit = pReport.CommitsSincePublish[i];
				// Escape curly braces so blessed doesn't treat them as markup
				let tmpSafe = `${tmpCommit.Hash} ${tmpCommit.Subject}`.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
				this._terminalOutput.log(`  {gray-fg}${tmpSafe}{/gray-fg}`);
			}
		}

		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}{blue-fg}────────────────────────────────────────{/blue-fg}{/bold}');
		this._terminalOutput.log('');

		// Summary block
		if (pReport.PublishedVersion)
		{
			this._terminalOutput.log(`  {bold}${pReport.Package}{/bold}  v${pReport.PublishedVersion} → v${pReport.LocalVersion}`);
		}
		else
		{
			this._terminalOutput.log(`  {bold}${pReport.Package}{/bold}  v${pReport.LocalVersion}  {gray-fg}(first publish){/gray-fg}`);
		}
		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}{yellow-fg}Publish to npm?  [Y] yes  [N] no{/yellow-fg}{/bold}');
		this._updateStatus('Publish? Y/N');
		this._awaitingConfirmation = true;
		this._screen.render();

		let tmpSelf = this;
		let tmpConfirmHandler = function (pCh, pKey)
		{
			tmpSelf._screen.removeListener('keypress', tmpConfirmHandler);
			tmpSelf._awaitingConfirmation = false;

			if (pCh === 'y' || pCh === 'Y')
			{
				tmpSelf._terminalOutput.log('');
				tmpSelf._terminalOutput.log('{green-fg}{bold}Publishing...{/bold}{/green-fg}');
				tmpSelf._terminalOutput.log('');
				tmpSelf._screen.render();

				if (tmpSelf.pict.log)
				{
					tmpSelf.pict.log.info(`PUBLISH  Confirmed -- publishing ${pReport.Package} v${pReport.LocalVersion}`);
				}

				tmpSelf.processRunner.run('npm', ['publish'], pModulePath, null, { append: true });
			}
			else
			{
				tmpSelf._terminalOutput.log('');
				tmpSelf._terminalOutput.log('{bold}────────────────────────────────────────{/bold}');
				tmpSelf._terminalOutput.log('{yellow-fg}{bold}Publish cancelled by user{/bold}{/yellow-fg}');
				if (tmpSelf.pict.log)
				{
					tmpSelf.pict.log.info(`PUBLISH  Cancelled by user -- ${pReport.Package} v${pReport.LocalVersion}`);
				}
				tmpSelf._updateStatus('Publish cancelled');
				tmpSelf._screen.render();
			}
		};

		this._screen.on('keypress', tmpConfirmHandler);
	}

	/**
	 * Format one ecosystem dep entry for the blessed widget. Mirrors the
	 * original color scheme exactly.
	 */
	_formatEcosystemDepLine(pDep)
	{
		if (pDep.LocalLink)
		{
			return `  {gray-fg}${pDep.Name}  ${pDep.Range}  (local link -- skipped){/gray-fg}`;
		}
		if (pDep.Error)
		{
			return `  {yellow-fg}${pDep.Name}  ${pDep.Range}  (could not fetch from npm){/yellow-fg}`;
		}
		if (pDep.CoversLatest)
		{
			let tmpRangeBase = pDep.Range.replace(/^[\^~>=<]*/, '');
			if (tmpRangeBase === pDep.LatestOnNpm)
			{
				return `  {green-fg}✓ ${pDep.Name}  ${pDep.Range}  (latest: ${pDep.LatestOnNpm}){/green-fg}`;
			}
			return `  {green-fg}✓ ${pDep.Name}  ${pDep.Range}  (latest: ${pDep.LatestOnNpm} -- covered by range){/green-fg}`;
		}
		return `  {red-fg}{bold}✗ ${pDep.Name}{/bold}  ${pDep.Range}  →  latest: ${pDep.LatestOnNpm}{/red-fg}`;
	}

	// ─────────────────────────────────────────────
	//  Content Display
	// ─────────────────────────────────────────────

	_showModuleWelcome()
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;

		this._terminalOutput.setContent('');
		this._terminalOutput.log(`{bold}Module: ${tmpBrowser.ModuleName}{/bold}`);
		this._terminalOutput.log(`{gray-fg}Path:   ${tmpBrowser.ModulePath}{/gray-fg}`);
		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}NPM{/bold}');
		this._terminalOutput.log('  {cyan-fg}[n]{/cyan-fg} ncu (retold)    {cyan-fg}[N]{/cyan-fg} ncu -u + install');
		this._terminalOutput.log('  {cyan-fg}[i]{/cyan-fg} npm install     {cyan-fg}[t]{/cyan-fg} npm test       {cyan-fg}[y]{/cyan-fg} npm run types  {cyan-fg}[b]{/cyan-fg} npm run build');
		this._terminalOutput.log('{bold}Version Bump{/bold}');
		this._terminalOutput.log('  {cyan-fg}[v]{/cyan-fg} bump patch');
		this._terminalOutput.log('{bold}GIT{/bold}');
		this._terminalOutput.log('  {cyan-fg}[d]{/cyan-fg} diff            {cyan-fg}[a]{/cyan-fg} add -A         {cyan-fg}[o]{/cyan-fg} commit         {cyan-fg}[p]{/cyan-fg} pull          {cyan-fg}[u]{/cyan-fg} push');
		this._terminalOutput.log('{bold}Software{/bold}');
		this._terminalOutput.log('  {cyan-fg}[!]{/cyan-fg} publish         {cyan-fg}[x]{/cyan-fg} kill running process');
		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}All Modules:{/bold}');
		this._terminalOutput.log('  {cyan-fg}[s]{/cyan-fg} Status.sh       {cyan-fg}[r]{/cyan-fg} Update.sh      {cyan-fg}[c]{/cyan-fg} Checkout.sh');
		this._terminalOutput.log('');
		this._terminalOutput.log('{bold}Output:{/bold}');
		this._terminalOutput.log('  {cyan-fg}[/]{/cyan-fg} Search output   {cyan-fg}]{/cyan-fg} Next match      {cyan-fg}[{/cyan-fg} Prev match      {cyan-fg}[Esc]{/cyan-fg} Clear search');
		this._terminalOutput.log('');
		this._terminalOutput.log('  {cyan-fg}[g]{/cyan-fg} Go to groups');
		this._terminalOutput.log('');
		this._terminalOutput.log('Select a file to view its contents, or press a shortcut key.');

		// Try to show package.json version info
		let tmpPkgPath = libPath.join(tmpBrowser.ModulePath, 'package.json');
		try
		{
			let tmpPkg = JSON.parse(libFs.readFileSync(tmpPkgPath, 'utf8'));
			this._terminalOutput.log('');
			this._terminalOutput.log(`{bold}${tmpPkg.name || tmpBrowser.ModuleName}{/bold} v${tmpPkg.version || '?'}`);
			if (tmpPkg.description)
			{
				this._terminalOutput.log(`{gray-fg}${tmpPkg.description}{/gray-fg}`);
			}
		}
		catch (pError)
		{
			// No package.json or not parseable -- skip
		}

		this._screen.render();
	}

	_showFileContents(pFilePath, pFileName)
	{
		this._terminalOutput.setContent('');
		this._terminalOutput.log(`{bold}${pFileName}{/bold}`);
		this._terminalOutput.log(`{gray-fg}${pFilePath}{/gray-fg}`);
		this._terminalOutput.log('');

		try
		{
			let tmpStat = libFs.statSync(pFilePath);

			// Skip very large files
			if (tmpStat.size > 1024 * 512)
			{
				this._terminalOutput.log(`{yellow-fg}File is too large to display (${(tmpStat.size / 1024).toFixed(0)} KB){/yellow-fg}`);
				this._screen.render();
				return;
			}

			let tmpContent = libFs.readFileSync(pFilePath, 'utf8');
			let tmpLines = tmpContent.split('\n');

			let tmpDisplayLimit = Math.min(tmpLines.length, FILE_VIEW_LINE_LIMIT);
			for (let i = 0; i < tmpDisplayLimit; i++)
			{
				// Escape curly braces so blessed doesn't parse them as markup tags
				let tmpLine = tmpLines[i].replace(/\{/g, '\\{').replace(/\}/g, '\\}');
				this._terminalOutput.log(tmpLine);
			}

			if (tmpLines.length > FILE_VIEW_LINE_LIMIT)
			{
				this._terminalOutput.log('');
				this._terminalOutput.log(`{yellow-fg}... truncated (showing ${FILE_VIEW_LINE_LIMIT} of ${tmpLines.length} lines){/yellow-fg}`);
			}

			this._updateStatus(`Viewing: ${pFileName} (${tmpLines.length} lines)`);
		}
		catch (pError)
		{
			this._terminalOutput.log(`{red-fg}Error reading file: ${pError.message}{/red-fg}`);
		}

		this._screen.render();
	}

	_showDirectoryContents(pDirPath, pDirName)
	{
		this._terminalOutput.setContent('');
		this._terminalOutput.log(`{bold}Directory: ${pDirName}/{/bold}`);
		this._terminalOutput.log(`{gray-fg}${pDirPath}{/gray-fg}`);
		this._terminalOutput.log('');

		try
		{
			let tmpEntries = libFs.readdirSync(pDirPath);
			tmpEntries.sort();

			for (let i = 0; i < tmpEntries.length; i++)
			{
				let tmpEntryPath = libPath.join(pDirPath, tmpEntries[i]);
				try
				{
					let tmpStat = libFs.statSync(tmpEntryPath);
					if (tmpStat.isDirectory())
					{
						this._terminalOutput.log(`  {cyan-fg}${tmpEntries[i]}/{/cyan-fg}`);
					}
					else
					{
						let tmpSize = tmpStat.size;
						let tmpSizeStr = tmpSize < 1024 ? `${tmpSize} B` : `${(tmpSize / 1024).toFixed(1)} KB`;
						this._terminalOutput.log(`  ${tmpEntries[i]}  {gray-fg}(${tmpSizeStr}){/gray-fg}`);
					}
				}
				catch (pError)
				{
					this._terminalOutput.log(`  ${tmpEntries[i]}`);
				}
			}

			this._updateStatus(`Directory: ${pDirName}/ (${tmpEntries.length} entries)`);
		}
		catch (pError)
		{
			this._terminalOutput.log(`{red-fg}Error reading directory: ${pError.message}{/red-fg}`);
		}

		this._screen.render();
	}

	// ─────────────────────────────────────────────
	//  File Logging
	// ─────────────────────────────────────────────

	_getLogFilePath()
	{
		let tmpNow = new Date();
		let tmpYear = tmpNow.getFullYear();
		let tmpMonth = String(tmpNow.getMonth() + 1).padStart(2, '0');
		let tmpDay = String(tmpNow.getDate()).padStart(2, '0');
		let tmpRepoRoot = libPath.resolve(libModuleCatalog.BasePath, '..');

		return libPath.join(tmpRepoRoot, `Retold-Manager-Log-${tmpYear}-${tmpMonth}-${tmpDay}.log`);
	}

	_toggleFileLogging()
	{
		let tmpLog = this.pict.log;

		if (this._fileLogStream)
		{
			// Turn off: close the writer and remove from all stream arrays
			tmpLog.info('--- File logging disabled ---');
			this._fileLogStream.closeWriter();

			let tmpUUID = this._fileLogStream.loggerUUID;
			delete tmpLog.activeLogStreams[tmpUUID];

			let tmpFilterOut = (pStream) => pStream.loggerUUID !== tmpUUID;
			tmpLog.logStreams = tmpLog.logStreams.filter(tmpFilterOut);
			tmpLog.logStreamsTrace = tmpLog.logStreamsTrace.filter(tmpFilterOut);
			tmpLog.logStreamsDebug = tmpLog.logStreamsDebug.filter(tmpFilterOut);
			tmpLog.logStreamsInfo = tmpLog.logStreamsInfo.filter(tmpFilterOut);
			tmpLog.logStreamsWarn = tmpLog.logStreamsWarn.filter(tmpFilterOut);
			tmpLog.logStreamsError = tmpLog.logStreamsError.filter(tmpFilterOut);
			tmpLog.logStreamsFatal = tmpLog.logStreamsFatal.filter(tmpFilterOut);

			this._fileLogStream = null;

			this._terminalOutput.log('{yellow-fg}File logging OFF{/yellow-fg}');
			this._updateStatus('Logging disabled');
		}
		else
		{
			// Turn on: create a simpleflatfile logger and add it to fable-log
			let tmpLogPath = this._getLogFilePath();
			let tmpProviders = tmpLog._Providers;

			if (!tmpProviders.simpleflatfile)
			{
				this._terminalOutput.log('{red-fg}simpleflatfile log provider not available{/red-fg}');
				this._screen.render();
				return;
			}

			let tmpStreamDef =
			{
				loggertype: 'simpleflatfile',
				level: 'info',
				path: tmpLogPath,
				outputloglinestoconsole: false,
				outputobjectstoconsole: false,
				Context: 'RetoldManager',
			};

			let tmpLogger = new tmpProviders.simpleflatfile(tmpStreamDef, tmpLog);
			tmpLogger.initialize();
			tmpLog.addLogger(tmpLogger, 'info');

			this._fileLogStream = tmpLogger;

			tmpLog.info('--- File logging enabled ---');

			this._terminalOutput.log(`{green-fg}File logging ON{/green-fg}  {gray-fg}${tmpLogPath}{/gray-fg}`);
			this._updateStatus(`Logging to ${libPath.basename(tmpLogPath)}`);
		}

		this._updateHeader();
		this._screen.render();
	}

	// ─────────────────────────────────────────────
	//  Header & Status Updates
	// ─────────────────────────────────────────────

	_updateHeader()
	{
		let tmpBrowser = this.pict.AppData.Manager.Browser;
		let tmpHeaderWidget = this.terminalUI.getWidget('#TUI-Header');

		if (!tmpHeaderWidget)
		{
			return;
		}

		let tmpHasModule = (tmpBrowser.Level === 'files' && tmpBrowser.ModulePath)
			|| (tmpBrowser.Level === 'modules');

		// Show [l]og shortcut only when logging is OFF so the user knows how to re-enable it
		let tmpNavKeys = this._fileLogStream
			? '[s]tatus [r] update [c]heckout  [/] search  |  [g] groups  [Tab] focus  [q] quit'
			: '[s]tatus [r] update [c]heckout  [/] search  |  [l]og  [g] groups  [Tab] focus  [q] quit';

		if (tmpHasModule)
		{
			// Determine the target module name to display
			let tmpTargetModule = '';
			if (tmpBrowser.Level === 'files')
			{
				tmpTargetModule = tmpBrowser.ModuleName;
			}
			else if (tmpBrowser.Level === 'modules')
			{
				// Show the highlighted module if one is selected (not ../)
				let tmpSelected = this._fileBrowser.selected;
				if (tmpSelected > 0)
				{
					tmpTargetModule = this._fileBrowser.getItem(tmpSelected).getText().trim().replace(/\/$/, '');
				}
			}

			if (tmpTargetModule)
			{
				// Two-line grouped header: category labels on line 1, global
				// nav on line 2. Keeps shortcuts discoverable at a glance
				// without the single-line wrap that used to mush everything
				// together.
				let tmpGroups =
					`{gray-fg}NPM{/gray-fg} [i]nstall [t]est t[y]pes [b]uild [n]cu [N] ncu -u`
					+ `    {gray-fg}Bump{/gray-fg} [v] patch`
					+ `    {gray-fg}GIT{/gray-fg} [d]iff [a]dd c[o]mmit [p]ull p[u]sh`
					+ `    {gray-fg}Software{/gray-fg} [!] publish`;
				tmpHeaderWidget.setContent(
					`{bold} Retold Manager{/bold}  |  {cyan-fg}${tmpTargetModule}{/cyan-fg}  |  ${tmpGroups}\n`
					+ ` [x] kill  ${tmpNavKeys}`
				);
			}
			else
			{
				tmpHeaderWidget.setContent(
					`{bold} Retold Manager{/bold}  |  ${tmpNavKeys}`
				);
			}
		}
		else
		{
			tmpHeaderWidget.setContent(
				`{bold} Retold Manager{/bold}  |  ${tmpNavKeys}`
			);
		}

		if (this._screen)
		{
			this._screen.render();
		}
	}

	_updateStatus(pMessage)
	{
		this.pict.AppData.Manager.StatusMessage = pMessage;

		if (this.pict.views['TUI-StatusBar'])
		{
			this.pict.views['TUI-StatusBar'].render();
		}

		if (this._screen)
		{
			this._screen.render();
		}
	}

	// ─────────────────────────────────────────────
	//  Key Bindings
	// ─────────────────────────────────────────────

	_bindNavigation(pScreen)
	{
		let tmpList = this._fileBrowser;

		// Enter -- drill into selected item
		tmpList.on('select', (pItem, pIndex) =>
		{
			this._drillIn(pIndex);
		});

		// Update the header when the cursor moves in the module list
		// so the targeted module name stays current
		tmpList.on('select item', () =>
		{
			this._updateHeader();
		});

		// Backspace / Escape -- go up one level
		tmpList.key(['backspace', 'escape'], () =>
		{
			this._drillOut();
		});

		// Tab -- toggle focus between file browser and terminal output
		pScreen.key(['tab'], () =>
		{
			if (this._fileBrowser === pScreen.focused)
			{
				this._terminalOutput.focus();
			}
			else
			{
				this._fileBrowser.focus();
			}
			this._screen.render();
		});

		// Module operation shortcuts
		pScreen.key(['i'], () => { this._runModuleOperation('npm', ['install']); });
		pScreen.key(['t'], () => { this._runModuleOperation('npm', ['test'], 0); });
		pScreen.key(['y'], () => { this._runModuleOperation('npm', ['run', 'types']); });
		pScreen.key(['b'], () => { this._runModuleOperation('npm', ['run', 'build']); });
		pScreen.key(['v'], () => { this._runModuleOperation('npm', ['version', 'patch', '--no-git-tag-version']); });
		pScreen.key(['d'], () => { this._runDiff(); });
		pScreen.key(['o'], () =>
		{
			if (this._awaitingConfirmation) { return; }

			let tmpModulePath = this._getModulePath();
			if (!tmpModulePath)
			{
				this._terminalOutput.setContent('');
				this._terminalOutput.log('{yellow-fg}{bold}Select a module first.{/bold}{/yellow-fg}');
				this._terminalOutput.log('');
				this._terminalOutput.log('Navigate into a module group, then select or enter a module');
				this._terminalOutput.log('before running operations.');
				this._screen.render();
				return;
			}

			this._awaitingConfirmation = true;

			let tmpPrompt = blessed.textbox(
				{
					parent: this._screen,
					bottom: 1,
					left: 40,
					right: 0,
					height: 3,
					border: { type: 'line' },
					label: ' Commit Message ',
					inputOnFocus: true,
					style:
					{
						fg: 'white',
						bg: 'black',
						border: { fg: 'yellow' },
						label: { fg: 'yellow', bold: true },
					},
				});

			let tmpCleanup = (pValue) =>
			{
				tmpPrompt.destroy();
				this._awaitingConfirmation = false;

				if (pValue && pValue.trim().length > 0)
				{
					let tmpCommit = libCommitComposer.buildCommitArgs(pValue);
					// ProcessRunner spawns with shell:true, so use the shell-quoted args.
					this.processRunner.run(tmpCommit.Command, tmpCommit.ShellArgs, tmpModulePath);
				}

				this._fileBrowser.focus();
				this._screen.render();
			};

			tmpPrompt.on('submit', (pValue) =>
			{
				tmpCleanup(pValue);
			});

			tmpPrompt.on('cancel', () =>
			{
				tmpCleanup(null);
			});

			tmpPrompt.focus();
			tmpPrompt.readInput();
			this._screen.render();
		});
		pScreen.key(['p'], () => { this._runModuleOperation('git', ['pull']); });
		pScreen.key(['u'], () => { this._runModuleOperation('git', ['push']); });
		pScreen.key(['!'], () => { this._runPublish(); });
		// [a] — stage every modification/new file (git add -A). Commit via [o]
		// after. Needed because `git commit -a` doesn't pick up untracked files.
		pScreen.key(['a'], () => { this._runModuleOperation('git', ['add', '-A']); });

		// npm-check-updates:
		//   [n] = check retold ecosystem (read-only)
		//   [N] = apply retold updates (ncu -u + npm install, with Y/N confirm)
		pScreen.key(['n'], () => { this._runNcu({ Apply: false, Scope: 'retold' }); });
		pScreen.key(['S-n'], () => { this._runNcu({ Apply: true,  Scope: 'retold' }); });

		// Global script operations (run against all modules)
		pScreen.key(['s'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			this.pict.views['TUI-Status'].runScript(this.processRunner, libModuleCatalog.BasePath);
		});
		pScreen.key(['r'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			this.pict.views['TUI-Update'].runScript(this.processRunner, libModuleCatalog.BasePath);
		});
		pScreen.key(['c'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			this.pict.views['TUI-Checkout'].runScript(this.processRunner, libModuleCatalog.BasePath);
		});

		// Kill running process
		pScreen.key(['x'], () =>
		{
			if (this.processRunner && this.processRunner.isRunning())
			{
				this.processRunner.kill();
				this._terminalOutput.log('{yellow-fg}{bold}Process killed by user{/bold}{/yellow-fg}');
				this._updateStatus('Killed');
				this._screen.render();
			}
		});

		// Toggle file logging
		pScreen.key(['l'], () =>
		{
			this._toggleFileLogging();
		});

		// Quit
		pScreen.key(['q'], () =>
		{
			this.terminalUI.destroyScreen();
		});

		// Search output buffer with /
		pScreen.key(['/'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			if (!this.processRunner.hasBuffer()) { return; }
			if (this.processRunner.isRunning()) { return; }

			this._awaitingConfirmation = true;

			// Create an inline prompt at the bottom of the terminal output
			let tmpPrompt = blessed.textbox(
				{
					parent: this._screen,
					bottom: 1,
					left: 40,
					right: 0,
					height: 3,
					border: { type: 'line' },
					label: ' Search ',
					inputOnFocus: true,
					style:
					{
						fg: 'white',
						bg: 'black',
						border: { fg: 'yellow' },
						label: { fg: 'yellow', bold: true },
					},
				});

			let tmpCleanup = (pValue) =>
			{
				tmpPrompt.destroy();
				this._awaitingConfirmation = false;

				if (pValue && pValue.trim().length > 0)
				{
					this.processRunner.search(pValue.trim());
				}

				this._fileBrowser.focus();
				this._screen.render();
			};

			// Use the submit event directly -- more reliable than readInput callback
			// for getting the entered value in blessed ^0.1.x
			tmpPrompt.on('submit', (pValue) =>
			{
				tmpCleanup(pValue);
			});

			tmpPrompt.on('cancel', () =>
			{
				tmpCleanup(null);
			});

			tmpPrompt.focus();
			tmpPrompt.readInput();
			this._screen.render();
		});

		// Search navigation: next match  (] to avoid conflict with other keys)
		pScreen.key([']'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			if (this.processRunner.isSearchActive())
			{
				this.processRunner.searchNavigate(1);
			}
		});

		// Search navigation: previous match
		pScreen.key(['['], () =>
		{
			if (this._awaitingConfirmation) { return; }
			if (this.processRunner.isSearchActive())
			{
				this.processRunner.searchNavigate(-1);
			}
		});

		// Escape clears search mode and restores full output
		pScreen.key(['escape'], () =>
		{
			if (this._awaitingConfirmation) { return; }
			if (this.processRunner.isSearchActive())
			{
				this.processRunner.searchClear();
			}
		});

		// Quick navigation: go to top-level groups
		pScreen.key(['g'], () =>
		{
			let tmpBrowser = this.pict.AppData.Manager.Browser;
			tmpBrowser.Level = 'groups';
			tmpBrowser.GroupIndex = -1;
			tmpBrowser.GroupName = '';
			tmpBrowser.GroupLabel = '';
			tmpBrowser.ModuleName = '';
			tmpBrowser.ModulePath = '';
			tmpBrowser.SubPath = '';
			this._populateFileList();
			this._fileBrowser.focus();
		});
	}
}

module.exports = RetoldManagerApp;
