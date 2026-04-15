/*
 * Retold Manager -- browser bootstrap (Phase 1)
 *
 * Vanilla JS wiring. Still the pre-pict-bundle version; the single-file
 * approach keeps the moving parts visible while we iterate. Handles:
 *   - sidebar (grouped module list, search)
 *   - workspace (module detail + action bar)
 *   - pre-publish preview modal + confirm-guarded publish
 *   - commit modal (textarea)
 *   - bump patch / minor / major
 *   - diff (canned two-step sequence via /operations/diff)
 *   - live output panel fed by /ws/manager/operations WebSocket
 *
 * Once pict-application bundling lands this file gets replaced by
 * `Pict.safeLoadPictApplication(RetoldManagerApplication)`.
 */

(function ()
{
	'use strict';

	// ─────────────────────────────────────────────
	//  API helpers
	// ─────────────────────────────────────────────

	const API = '/api/manager';

	function apiGet(pPath)
	{
		return fetch(API + pPath, { headers: { 'Accept': 'application/json' } })
			.then(function (pResponse)
				{
					if (!pResponse.ok)
					{
						return pResponse.text().then(function (pBody)
							{
								let tmpInfo;
								try { tmpInfo = JSON.parse(pBody); } catch (e) { tmpInfo = { Message: pBody }; }
								let tmpErr = new Error(tmpInfo.Message || ('HTTP ' + pResponse.status));
								tmpErr.Status = pResponse.status;
								tmpErr.Info = tmpInfo;
								throw tmpErr;
							});
					}
					return pResponse.json();
				});
	}

	function apiRequest(pMethod, pPath, pBody)
	{
		let tmpInit =
			{
				method: pMethod,
				headers: { 'Accept': 'application/json' },
			};
		if (pBody !== undefined && pBody !== null)
		{
			tmpInit.headers['Content-Type'] = 'application/json';
			tmpInit.body = JSON.stringify(pBody);
		}
		return fetch(API + pPath, tmpInit)
			.then(function (pResponse)
				{
					return pResponse.text().then(function (pRaw)
						{
							let tmpBody;
							try { tmpBody = JSON.parse(pRaw); } catch (e) { tmpBody = { Message: pRaw }; }
							if (!pResponse.ok)
							{
								let tmpErr = new Error(tmpBody.Message || ('HTTP ' + pResponse.status));
								tmpErr.Status = pResponse.status;
								tmpErr.Info = tmpBody;
								throw tmpErr;
							}
							return tmpBody;
						});
				});
	}

	function apiPost(pPath, pBody)   { return apiRequest('POST',   pPath, pBody || {}); }
	function apiPatch(pPath, pBody)  { return apiRequest('PATCH',  pPath, pBody || {}); }
	function apiDelete(pPath)        { return apiRequest('DELETE', pPath); }

	// ─────────────────────────────────────────────
	//  Elements
	// ─────────────────────────────────────────────

	const elHealthBadge    = document.getElementById('RM-HealthBadge');
	const elSidebarSearch  = document.getElementById('RM-SidebarSearch');
	const elModuleList     = document.getElementById('RM-ModuleList');
	const elWorkspace      = document.getElementById('RM-Workspace');
	const elStatusMessage  = document.getElementById('RM-StatusMessage');
	const elManifestToggle = document.getElementById('RM-ManifestToggle');
	const elLogToggle      = document.getElementById('RM-LogToggle');
	const elScanButton     = document.getElementById('RM-ScanButton');
	const elDirtyOnly      = document.getElementById('RM-DirtyOnly');
	const elScanMeta       = document.getElementById('RM-ScanMeta');

	// ─────────────────────────────────────────────
	//  localStorage helpers
	// ─────────────────────────────────────────────

	const LS_KEY_FILTER    = 'rm:filter:query';
	const LS_KEY_DIRTYONLY = 'rm:filter:dirtyOnly';
	const LS_KEY_SCAN      = 'rm:scan:results';
	const LS_KEY_SCAN_WHEN = 'rm:scan:when';

	function lsGet(pKey)
	{
		try { return window.localStorage.getItem(pKey); } catch (e) { return null; }
	}
	function lsSet(pKey, pValue)
	{
		try { window.localStorage.setItem(pKey, pValue); } catch (e) { /* quota / private mode */ }
	}

	// ─────────────────────────────────────────────
	//  State
	// ─────────────────────────────────────────────

	let _mode = 'workspace';          // 'workspace' | 'manifest' | 'log' | 'ripple'
	let _allModules = [];
	let _groupedModules = {};
	let _selectedModule = null;
	let _selectedDetail = null;       // /modules/:name payload
	let _filterQuery = '';
	let _dirtyOnly = false;
	let _scanResults = {};            // { name -> { Dirty, FileCount, Branch, Ahead, Behind } }
	let _scanWhen = null;             // ISO timestamp of last scan

	let _activeOperationId = null;
	let _activePreviewHash = null;    // for the current workspace's publish flow

	let _ws = null;
	let _wsConnected = false;

	// ─────────────────────────────────────────────
	//  Utilities
	// ─────────────────────────────────────────────

	function setStatus(pText) { elStatusMessage.textContent = pText; }

	function escapeHtml(pText)
	{
		if (pText == null) { return ''; }
		return String(pText)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function groupBy(pList, pKey)
	{
		let tmpMap = {};
		for (let i = 0; i < pList.length; i++)
		{
			let tmpGroupKey = pList[i][pKey];
			if (!tmpMap[tmpGroupKey]) { tmpMap[tmpGroupKey] = []; }
			tmpMap[tmpGroupKey].push(pList[i]);
		}
		return tmpMap;
	}

	// ─────────────────────────────────────────────
	//  WebSocket (operations stream)
	// ─────────────────────────────────────────────

	function connectWS()
	{
		if (_ws) { try { _ws.close(); } catch (e) {} }

		let tmpUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://')
			+ window.location.host + '/ws/manager/operations';
		_ws = new WebSocket(tmpUrl);

		_ws.addEventListener('open', function ()
			{
				_wsConnected = true;
				elHealthBadge.classList.add('ok');
			});

		_ws.addEventListener('close', function ()
			{
				_wsConnected = false;
				elHealthBadge.classList.remove('ok');
				setTimeout(connectWS, 2000);
			});

		_ws.addEventListener('error', function () { /* noop; close handler reconnects */ });

		_ws.addEventListener('message', function (pEvent)
			{
				let tmpFrame;
				try { tmpFrame = JSON.parse(pEvent.data); }
				catch (e) { return; }
				handleFrame(tmpFrame);
			});
	}

	function sendWS(pMessage)
	{
		if (_ws && _ws.readyState === WebSocket.OPEN)
		{
			_ws.send(JSON.stringify(pMessage));
		}
	}

	function handleFrame(pFrame)
	{
		// Ripple frames are routed to the ripple handler first; they are
		// RippleId-scoped and never carry an OperationId.
		if (pFrame.Type && pFrame.Type.indexOf('ripple-') === 0)
		{
			handleRippleFrame(pFrame);
			return;
		}

		// While a ripple is active, route op-scoped frames (start/stdout/
		// complete/error) to the currently-running step so the user can see
		// what each sub-command is doing without leaving ripple mode.
		if (_activeRipple && _activeRipple.Status === 'running')
		{
			let tmpStepOrder = _activeRipple.Steps.findIndex(function (pS) { return pS.Status === 'running'; });
			if (tmpStepOrder >= 0)
			{
				if (pFrame.Type === 'stdout')
				{
					appendStepOutput(tmpStepOrder, pFrame.Channel || 'stdout', pFrame.Text);
					renderRippleStepOutput(tmpStepOrder);
					return;
				}
				if (pFrame.Type === 'start')
				{
					appendStepOutput(tmpStepOrder, 'meta',
						'$ ' + pFrame.CommandString + '   (cwd: ' + pFrame.Cwd + ')');
					renderRippleStepOutput(tmpStepOrder);
					return;
				}
				if (pFrame.Type === 'complete')
				{
					appendStepOutput(tmpStepOrder,
						pFrame.ExitCode === 0 ? 'success' : 'error',
						(pFrame.ExitCode === 0 ? '✓ done ' : '✗ exit ' + pFrame.ExitCode + ' ')
							+ '(' + (pFrame.Duration || '') + ', ' + (pFrame.LineCount || 0) + ' lines)');
					renderRippleStepOutput(tmpStepOrder);
					return;
				}
				if (pFrame.Type === 'error')
				{
					appendStepOutput(tmpStepOrder, 'error', '✗ error: ' + pFrame.Error);
					renderRippleStepOutput(tmpStepOrder);
					return;
				}
			}
		}

		// Only show frames for the active operation (i.e. the one just kicked
		// off in this browser). If more than one client is open they'll each
		// filter to their own active op.
		if (!_activeOperationId || pFrame.OperationId !== _activeOperationId)
		{
			if (pFrame.Type === 'hello') { /* no-op */ }
			return;
		}

		switch (pFrame.Type)
		{
			case 'start':
				appendOutput('cmd', '$ ' + pFrame.CommandString);
				appendOutput('meta', '  cwd: ' + pFrame.Cwd);
				if (pFrame.Label) { appendOutput('meta', '  ' + pFrame.Label); }
				setOutputHeader('running', pFrame.CommandString);
				break;
			case 'stdout':
				appendOutput(pFrame.Channel === 'stderr' ? 'stderr' : '', pFrame.Text);
				break;
			case 'progress':
				if (pFrame.Message)
				{
					appendOutput('meta', '... ' + pFrame.Message);
				}
				break;
			case 'complete':
				if (pFrame.ExitCode === 0)
				{
					appendOutput('success',
						'✓ Done (' + (pFrame.Duration || '') + ', '
							+ (pFrame.LineCount || 0) + ' lines)');
					setOutputHeader('success', 'Completed');
				}
				else
				{
					appendOutput('error',
						'✗ Failed exit ' + pFrame.ExitCode + ' (' + (pFrame.Duration || '') + ')');
					setOutputHeader('error', 'Failed exit ' + pFrame.ExitCode);
				}
				onOperationEnded(pFrame);
				break;
			case 'error':
				appendOutput('error', '✗ Error: ' + pFrame.Error);
				setOutputHeader('error', 'Error');
				onOperationEnded(pFrame);
				break;
			case 'cancelled':
				appendOutput('error', '✗ Cancelled');
				setOutputHeader('error', 'Cancelled');
				onOperationEnded(pFrame);
				break;
			default:
				break;
		}
	}

	function onOperationEnded(pFrame)
	{
		let tmpWasVersionOrCommit = _lastCommandTag === 'version'
			|| _lastCommandTag === 'commit'
			|| _lastCommandTag === 'git-add';
		_activeOperationId = null;
		_lastCommandTag = null;
		enableActionButtons(true);

		// If a version bump or commit just finished successfully, refresh the
		// module detail so the workspace shows the new version / clean tree.
		// Preserve the OutputStream contents across the refresh so the user
		// can still see what happened (a bump spits out the new version line;
		// blowing that away leaves an empty-looking "success" pane).
		if (tmpWasVersionOrCommit && pFrame.Type === 'complete' && pFrame.ExitCode === 0 && _selectedModule)
		{
			let tmpOutputEl = document.getElementById('RM-Output');
			let tmpHeaderEl = document.getElementById('RM-OutputHeader');
			let tmpPreservedOutput = tmpOutputEl ? tmpOutputEl.innerHTML : null;
			let tmpPreservedHeader = tmpHeaderEl ? tmpHeaderEl.outerHTML : null;

			refreshWorkspace(function ()
				{
					if (tmpPreservedOutput !== null)
					{
						let tmpNewOutput = document.getElementById('RM-Output');
						if (tmpNewOutput) { tmpNewOutput.innerHTML = tmpPreservedOutput; tmpNewOutput.scrollTop = tmpNewOutput.scrollHeight; }
					}
					if (tmpPreservedHeader !== null)
					{
						let tmpNewHeader = document.getElementById('RM-OutputHeader');
						if (tmpNewHeader && tmpNewHeader.parentNode)
						{
							tmpNewHeader.outerHTML = tmpPreservedHeader;
						}
					}
				});
		}
	}

	// ─────────────────────────────────────────────
	//  Health
	// ─────────────────────────────────────────────

	function pollHealth()
	{
		apiGet('/health').then(
			function (pData)
				{
					elHealthBadge.textContent = pData.Version + ' · ' + pData.ModuleCount + ' modules';
					elHealthBadge.className = 'badge' + (_wsConnected ? ' ok' : '');
				},
			function ()
				{
					elHealthBadge.textContent = 'disconnected';
					elHealthBadge.className = 'badge error';
				});
	}

	// ─────────────────────────────────────────────
	//  Sidebar
	// ─────────────────────────────────────────────

	function loadModules()
	{
		setStatus('Loading modules...');
		apiGet('/modules').then(
			function (pModules)
				{
					_allModules = pModules;
					_groupedModules = groupBy(pModules, 'Group');
					renderSidebar();
					setStatus('Ready. ' + pModules.length + ' modules.');
				},
			function (pError)
				{
					elModuleList.innerHTML = '<p class="loading">Could not load modules: '
						+ escapeHtml(pError.message) + '</p>';
					setStatus('Error loading modules.');
				});
	}

	function renderSidebar()
	{
		let tmpQuery = _filterQuery.toLowerCase();
		let tmpHtml = '';
		let tmpGroupOrder = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];

		for (let i = 0; i < tmpGroupOrder.length; i++)
		{
			let tmpGroupName = tmpGroupOrder[i];
			let tmpModules = _groupedModules[tmpGroupName] || [];
			if (tmpQuery)
			{
				tmpModules = tmpModules.filter(function (pM)
					{
						return pM.Name.toLowerCase().indexOf(tmpQuery) !== -1;
					});
			}
			if (_dirtyOnly)
			{
				tmpModules = tmpModules.filter(function (pM)
					{
						let tmpScan = _scanResults[pM.Name];
						if (!tmpScan) { return false; }
						return !!tmpScan.Dirty || (tmpScan.Ahead || 0) > 0 || (tmpScan.Behind || 0) > 0;
					});
			}
			if (tmpModules.length === 0) { continue; }

			tmpHtml += '<div class="group-header">' + escapeHtml(tmpGroupName)
				+ ' <span style="opacity:0.6">(' + tmpModules.length + ')</span></div>';
			for (let j = 0; j < tmpModules.length; j++)
			{
				let tmpModule = tmpModules[j];
				let tmpSelected = (_selectedModule === tmpModule.Name) ? ' selected' : '';
				let tmpScan = _scanResults[tmpModule.Name];
				let tmpMarkers = '';
				if (tmpScan)
				{
					if (tmpScan.Dirty)
					{
						tmpMarkers += ' <span class="marker-dirty" title="' + tmpScan.FileCount + ' changed file(s)">●</span>';
					}
					if (tmpScan.Ahead)
					{
						tmpMarkers += '<span class="marker-ahead" title="' + tmpScan.Ahead + ' ahead">↑' + tmpScan.Ahead + '</span>';
					}
					if (tmpScan.Behind)
					{
						tmpMarkers += '<span class="marker-behind" title="' + tmpScan.Behind + ' behind">↓' + tmpScan.Behind + '</span>';
					}
				}
				tmpHtml += '<div class="module-row' + tmpSelected + '" data-name="'
					+ escapeHtml(tmpModule.Name) + '">'
					+ '<span class="name">' + escapeHtml(tmpModule.Name) + tmpMarkers + '</span>'
					+ '</div>';
			}
		}

		elModuleList.innerHTML = tmpHtml || '<p class="loading">'
			+ (_dirtyOnly ? 'No dirty modules (click 🔍 to re-scan).' : 'No modules match the filter.')
			+ '</p>';

		let tmpRows = elModuleList.querySelectorAll('.module-row');
		for (let i = 0; i < tmpRows.length; i++)
		{
			tmpRows[i].addEventListener('click', function (pEvent)
				{
					let tmpName = pEvent.currentTarget.getAttribute('data-name');
					selectModule(tmpName);
				});
		}
	}

	// ─────────────────────────────────────────────
	//  Scan
	// ─────────────────────────────────────────────

	function runScan()
	{
		elScanButton.classList.add('scanning');
		elScanButton.disabled = true;
		elScanMeta.textContent = 'scanning…';
		setStatus('Scanning all modules...');

		apiGet('/modules/scan').then(
			function (pBody)
				{
					_scanResults = pBody.Results || {};
					_scanWhen = pBody.ScannedAt;
					lsSet(LS_KEY_SCAN, JSON.stringify(_scanResults));
					lsSet(LS_KEY_SCAN_WHEN, _scanWhen);
					updateScanMeta();
					renderSidebar();
					setStatus('Scan complete (' + pBody.ElapsedMs + 'ms, ' + pBody.ModuleCount + ' modules).');
				},
			function (pError)
				{
					elScanMeta.textContent = 'scan failed';
					setStatus('Scan failed: ' + pError.message);
				}
		).then(function ()
			{
				elScanButton.classList.remove('scanning');
				elScanButton.disabled = false;
			});
	}

	function updateScanMeta()
	{
		if (!_scanWhen) { elScanMeta.textContent = ''; return; }
		let tmpNames = Object.keys(_scanResults);
		let tmpDirty = tmpNames.filter(function (pN) { return _scanResults[pN].Dirty; }).length;
		let tmpDate = new Date(_scanWhen);
		let tmpAge = Math.max(0, Math.floor((Date.now() - tmpDate.getTime()) / 1000));
		let tmpAgeStr;
		if (tmpAge < 60) { tmpAgeStr = tmpAge + 's ago'; }
		else if (tmpAge < 3600) { tmpAgeStr = Math.floor(tmpAge / 60) + 'm ago'; }
		else { tmpAgeStr = Math.floor(tmpAge / 3600) + 'h ago'; }
		elScanMeta.textContent = tmpDirty + ' dirty · ' + tmpAgeStr;
	}

	// ─────────────────────────────────────────────
	//  Workspace
	// ─────────────────────────────────────────────

	function selectModule(pName)
	{
		if (_mode === 'manifest')
		{
			// User clicked a module from the sidebar while in manifest mode —
			// switch back to the workspace view for that module.
			_mode = 'workspace';
			elManifestToggle.textContent = '⚙ Manifest';
		}
		// (Log is now a modal overlay, not a mode — nothing to reset here.)
		_selectedModule = pName;
		_activePreviewHash = null;
		renderSidebar();
		elWorkspace.innerHTML = '<div class="placeholder"><h2>Loading ' + escapeHtml(pName) + '...</h2></div>';
		setStatus('Loading ' + pName + '...');
		refreshWorkspace();
	}

	function refreshWorkspace(fAfter)
	{
		if (!_selectedModule) { return; }
		let tmpName = _selectedModule;

		apiGet('/modules/' + encodeURIComponent(tmpName)).then(
			function (pDetail)
				{
					_selectedDetail = pDetail;
					renderWorkspace(pDetail);
					setStatus('Ready. ' + tmpName + '.');
					if (typeof fAfter === 'function') { fAfter(); }
				},
			function (pError)
				{
					elWorkspace.innerHTML = '<div class="placeholder"><h2>Error</h2><p>'
						+ escapeHtml(pError.message) + '</p></div>';
					setStatus('Error loading ' + tmpName + '.');
				});
	}

	function renderWorkspace(pDetail)
	{
		let tmpManifest = pDetail.Manifest;
		let tmpPkg = pDetail.Package;
		let tmpGit = pDetail.GitStatus;

		let tmpHtml = '';

		// Header
		tmpHtml += '<div class="workspace-header">';
		tmpHtml += '<span class="module-name">' + escapeHtml(tmpManifest.Name) + '</span>';
		if (tmpPkg) { tmpHtml += '<span class="module-version">v' + escapeHtml(tmpPkg.Version) + '</span>'; }
		if (tmpGit && tmpGit.Branch) { tmpHtml += '<span class="module-branch">' + escapeHtml(tmpGit.Branch) + '</span>'; }
		tmpHtml += '<div class="workspace-header-right">';
		tmpHtml += '  <button class="action danger" data-op="cancel" disabled>Cancel</button>';
		if (tmpManifest.GitHub) { tmpHtml += '<a href="' + escapeHtml(tmpManifest.GitHub) + '" target="_blank">GitHub ↗</a>'; }
		if (tmpManifest.Documentation) { tmpHtml += '<a href="' + escapeHtml(tmpManifest.Documentation) + '" target="_blank">Docs ↗</a>'; }
		tmpHtml += '</div>';
		tmpHtml += '</div>';

		if (tmpManifest.Description)
		{
			tmpHtml += '<p style="color:var(--color-muted);margin-top:0">'
				+ escapeHtml(tmpManifest.Description) + '</p>';
		}

		// Action bar — categorized clusters
		tmpHtml += '<div class="action-groups">';

		tmpHtml += '<div class="action-group">';
		tmpHtml += '  <div class="action-group-label">NPM</div>';
		tmpHtml += '  <div class="action-group-buttons">';
		tmpHtml += '    <button class="action" data-op="ncu">NCU</button>';
		tmpHtml += '    <button class="action" data-op="install">Install</button>';
		tmpHtml += '    <button class="action" data-op="test">Test</button>';
		tmpHtml += '    <button class="action" data-op="build">Build</button>';
		tmpHtml += '  </div>';
		tmpHtml += '</div>';

		tmpHtml += '<div class="action-group">';
		tmpHtml += '  <div class="action-group-label">Version Bump</div>';
		tmpHtml += '  <div class="action-group-buttons">';
		tmpHtml += '    <button class="action" data-op="bump-major">Major</button>';
		tmpHtml += '    <button class="action" data-op="bump-minor">Minor</button>';
		tmpHtml += '    <button class="action primary" data-op="bump-patch">Patch</button>';
		tmpHtml += '  </div>';
		tmpHtml += '</div>';

		tmpHtml += '<div class="action-group">';
		tmpHtml += '  <div class="action-group-label">GIT</div>';
		tmpHtml += '  <div class="action-group-buttons">';
		tmpHtml += '    <button class="action" data-op="pull">Pull</button>';
		tmpHtml += '    <button class="action" data-op="diff">Diff</button>';
		tmpHtml += '    <button class="action" data-op="commit">Commit</button>';
		tmpHtml += '    <button class="action" data-op="push">Push</button>';
		tmpHtml += '  </div>';
		tmpHtml += '</div>';

		tmpHtml += '<div class="action-group">';
		tmpHtml += '  <div class="action-group-label">Software</div>';
		tmpHtml += '  <div class="action-group-buttons">';
		tmpHtml += '    <button class="action success" data-op="publish">Publish</button>';
		tmpHtml += '    <button class="action primary" data-op="ripple">⚡ Ripple</button>';
		tmpHtml += '  </div>';
		tmpHtml += '</div>';

		tmpHtml += '</div>';

		// Package + git summary
		if (tmpPkg)
		{
			tmpHtml += '<div class="workspace-section">';
			tmpHtml += '<h3>Package</h3>';
			tmpHtml += '<dl class="kv">';
			tmpHtml += '<dt>name</dt><dd>' + escapeHtml(tmpPkg.Name) + '</dd>';
			tmpHtml += '<dt>version</dt><dd>' + escapeHtml(tmpPkg.Version || '—') + '</dd>';
			tmpHtml += '<dt>dependencies</dt><dd>' + Object.keys(tmpPkg.Dependencies).length + '</dd>';
			tmpHtml += '<dt>devDependencies</dt><dd>' + Object.keys(tmpPkg.DevDependencies).length + '</dd>';
			tmpHtml += '</dl>';
			tmpHtml += '</div>';
		}

		if (tmpGit)
		{
			tmpHtml += '<div class="workspace-section">';
			tmpHtml += '<h3>Git status</h3>';
			tmpHtml += '<dl class="kv">';
			tmpHtml += '<dt>branch</dt><dd>' + escapeHtml(tmpGit.Branch || '—') + '</dd>';
			tmpHtml += '<dt>ahead / behind</dt><dd>' + tmpGit.Ahead + ' / ' + tmpGit.Behind + '</dd>';
			tmpHtml += '<dt>dirty</dt><dd>' + (tmpGit.Dirty ? 'yes (' + tmpGit.Files.length + ' files)' : 'no') + '</dd>';
			tmpHtml += '</dl>';
			if (tmpGit.Files.length > 0)
			{
				let tmpHasUntracked = tmpGit.Files.some(function (pF) { return pF.Status === '??'; });

				if (tmpHasUntracked)
				{
					tmpHtml += '<div style="margin-top:6px">';
					tmpHtml += '  <button class="action primary" data-op="git-add-all">+ Add all untracked</button>';
					tmpHtml += '</div>';
				}

				tmpHtml += '<div style="margin-top:8px">';
				for (let i = 0; i < tmpGit.Files.length; i++)
				{
					let tmpFile = tmpGit.Files[i];
					let tmpIsUntracked = (tmpFile.Status === '??');
					tmpHtml += '<div class="git-file">'
						+ '<span class="st">' + escapeHtml(tmpFile.Status.trim() || '··') + '</span>'
						+ escapeHtml(tmpFile.Path);
					if (tmpIsUntracked)
					{
						tmpHtml += ' <button class="git-add-file" data-op="git-add-one" data-path="'
							+ escapeHtml(tmpFile.Path) + '">+ add</button>';
					}
					tmpHtml += '</div>';
				}
				tmpHtml += '</div>';

				// Diff panel — populated on demand by the Diff button
				tmpHtml += '<div class="diff-panel" id="RM-DiffPanel" style="display:none">';
				tmpHtml += '  <div class="diff-header">';
				tmpHtml += '    <span id="RM-DiffSummary">diff</span>';
				tmpHtml += '    <button data-act="diff-close">close</button>';
				tmpHtml += '  </div>';
				tmpHtml += '  <div class="diff-body" id="RM-DiffBody"></div>';
				tmpHtml += '</div>';
			}
			tmpHtml += '</div>';
		}

		// Output panel container (always present, so operations can stream in)
		tmpHtml += '<div id="RM-OutputPanel">';
		tmpHtml += '  <div id="RM-OutputHeader"><span><span class="live-dot"></span><span id="RM-OutputHeaderText">idle</span></span></div>';
		tmpHtml += '  <div id="RM-Output"></div>';
		tmpHtml += '</div>';

		elWorkspace.innerHTML = tmpHtml;
		wireActionButtons();
		wireDiffCloseButton();
	}

	function wireDiffCloseButton()
	{
		let tmpClose = elWorkspace.querySelector('[data-act="diff-close"]');
		if (!tmpClose) { return; }
		tmpClose.addEventListener('click', function ()
			{
				let tmpPanel = document.getElementById('RM-DiffPanel');
				let tmpBody = document.getElementById('RM-DiffBody');
				if (tmpPanel) { tmpPanel.style.display = 'none'; }
				if (tmpBody) { tmpBody.innerHTML = ''; }
			});
	}

	// ─────────────────────────────────────────────
	//  Output panel
	// ─────────────────────────────────────────────

	function clearOutput()
	{
		let tmpOutput = document.getElementById('RM-Output');
		if (tmpOutput) { tmpOutput.innerHTML = ''; }
	}

	function appendOutput(pClass, pText)
	{
		let tmpOutput = document.getElementById('RM-Output');
		if (!tmpOutput) { return; }
		let tmpLine = document.createElement('span');
		tmpLine.className = 'line' + (pClass ? ' ' + pClass : '');
		tmpLine.textContent = pText + '\n';
		tmpOutput.appendChild(tmpLine);
		tmpOutput.scrollTop = tmpOutput.scrollHeight;
	}

	function setOutputHeader(pState, pMessage)
	{
		let tmpHeader = document.getElementById('RM-OutputHeader');
		let tmpText = document.getElementById('RM-OutputHeaderText');
		if (!tmpHeader || !tmpText) { return; }
		tmpHeader.className = '';
		if (pState) { tmpHeader.classList.add(pState); }
		tmpText.textContent = pMessage || 'idle';
	}

	// ─────────────────────────────────────────────
	//  Action buttons
	// ─────────────────────────────────────────────

	let _lastCommandTag = null;   // so onOperationEnded can refresh after version/commit

	function enableActionButtons(pEnabled)
	{
		let tmpButtons = document.querySelectorAll('button.action');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			let tmpBtn = tmpButtons[i];
			if (tmpBtn.getAttribute('data-op') === 'cancel')
			{
				tmpBtn.disabled = pEnabled;
			}
			else
			{
				tmpBtn.disabled = !pEnabled;
			}
		}
	}

	function wireActionButtons()
	{
		// Main toolbar buttons plus the per-file "+ add" inline buttons in
		// the git status list; both route to onActionClick via data-op.
		let tmpButtons = elWorkspace.querySelectorAll('button.action, button.git-add-file');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', onActionClick);
		}
	}

	function onActionClick(pEvent)
	{
		let tmpOp = pEvent.currentTarget.getAttribute('data-op');
		let tmpModule = _selectedModule;
		if (!tmpModule) { return; }

		switch (tmpOp)
		{
			case 'install':     return runGeneric(tmpModule, 'npm', ['install']);
			case 'test':        return runGeneric(tmpModule, 'npm', ['test']);
			case 'build':       return runGeneric(tmpModule, 'npm', ['run', 'build']);
			case 'pull':        return runGeneric(tmpModule, 'git', ['pull']);
			case 'push':        return runGeneric(tmpModule, 'git', ['push']);
			case 'diff':        return showInlineDiff(tmpModule);
			case 'bump-patch':  return runVersion(tmpModule, 'patch');
			case 'bump-minor':  return runVersion(tmpModule, 'minor');
			case 'bump-major':  return runVersion(tmpModule, 'major');
			case 'commit':      return openCommitModal(tmpModule);
			case 'publish':     return openPublishModal(tmpModule);
			case 'ncu':         return openNcuModal(tmpModule);
			case 'ripple':      return openRipplePlanner(tmpModule);
			case 'git-add-all': return runGitAdd(tmpModule, { All: true });
			case 'git-add-one':
			{
				let tmpPath = pEvent.currentTarget.getAttribute('data-path');
				if (tmpPath) { return runGitAdd(tmpModule, { Paths: [tmpPath] }); }
				return;
			}
			case 'cancel':      return cancelActive();
			default: return;
		}
	}

	function runGitAdd(pName, pBody)
	{
		apiPost('/modules/' + encodeURIComponent(pName) + '/operations/git-add', pBody).then(
			function (pResp) { beginOperation(pResp.OperationId, 'git-add'); },
			function (pError) { setStatus('git add failed: ' + pError.message); });
	}

	function beginOperation(pOperationId, pTag)
	{
		_activeOperationId = pOperationId;
		_lastCommandTag = pTag || null;
		clearOutput();
		enableActionButtons(false);
		setOutputHeader('running', pOperationId);
		appendOutput('meta', '[' + pOperationId + '] starting...');
	}

	function runGeneric(pName, pCommand, pArgs)
	{
		apiPost('/modules/' + encodeURIComponent(pName) + '/operations/run',
			{
				Command: pCommand,
				Args: pArgs,
				Label: pCommand + ' ' + pArgs.join(' '),
			}).then(
			function (pBody) { beginOperation(pBody.OperationId, pCommand + '-' + pArgs[0]); },
			function (pError) { setStatus('Run failed: ' + pError.message); });
	}

	function runDiff(pName)
	{
		apiPost('/modules/' + encodeURIComponent(pName) + '/operations/diff', {}).then(
			function (pBody) { beginOperation(pBody.OperationId, 'diff'); },
			function (pError) { setStatus('Diff failed: ' + pError.message); });
	}

	/**
	 * Render a syntax-coloured unified diff inline in the workspace, rather
	 * than streaming raw text through the output panel. Excludes dist/ by
	 * default (matches the TUI's [d] sequence).
	 */
	function showInlineDiff(pName)
	{
		let tmpPanel = document.getElementById('RM-DiffPanel');
		let tmpBody = document.getElementById('RM-DiffBody');
		let tmpSummary = document.getElementById('RM-DiffSummary');
		if (!tmpPanel || !tmpBody || !tmpSummary) { return; }

		tmpPanel.style.display = '';
		tmpSummary.textContent = 'loading diff...';
		tmpBody.innerHTML = '<div class="diff-line meta">fetching ' + escapeHtml(pName) + ' diff...</div>';

		fetch('/api/manager/modules/' + encodeURIComponent(pName) + '/git/diff',
			{ headers: { 'Accept': 'text/plain' } })
			.then(function (pResponse)
				{
					if (!pResponse.ok) { throw new Error('HTTP ' + pResponse.status); }
					return pResponse.text();
				})
			.then(function (pDiff)
				{
					renderDiff(pDiff, tmpBody, tmpSummary);
				},
				function (pError)
				{
					tmpBody.innerHTML = '<div class="diff-line del">Diff fetch failed: '
						+ escapeHtml(pError.message) + '</div>';
					tmpSummary.textContent = 'error';
				});
	}

	function renderDiff(pText, pBody, pSummary)
	{
		if (!pText || pText.trim().length === 0)
		{
			pBody.innerHTML = '<div class="diff-line none">No changes (excluding dist/).</div>';
			pSummary.textContent = 'clean';
			return;
		}

		let tmpLines = pText.split('\n');
		let tmpParts = [];
		let tmpFiles = 0;
		let tmpAdds = 0;
		let tmpDels = 0;

		for (let i = 0; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i];
			if (tmpLine.length === 0 && i === tmpLines.length - 1) { continue; }

			let tmpCls;
			if (tmpLine.startsWith('diff --git'))
			{
				tmpCls = 'file';
				tmpFiles++;
			}
			else if (tmpLine.startsWith('index ')
				|| tmpLine.startsWith('new file')
				|| tmpLine.startsWith('deleted file')
				|| tmpLine.startsWith('---')
				|| tmpLine.startsWith('+++')
				|| tmpLine.startsWith('similarity ')
				|| tmpLine.startsWith('rename '))
			{
				tmpCls = 'meta';
			}
			else if (tmpLine.startsWith('@@'))
			{
				tmpCls = 'hunk';
			}
			else if (tmpLine.startsWith('+'))
			{
				tmpCls = 'add';
				tmpAdds++;
			}
			else if (tmpLine.startsWith('-'))
			{
				tmpCls = 'del';
				tmpDels++;
			}
			else
			{
				tmpCls = '';
			}

			tmpParts.push('<div class="diff-line ' + tmpCls + '">' + escapeHtml(tmpLine) + '</div>');
		}

		pBody.innerHTML = tmpParts.join('');
		pSummary.textContent = tmpFiles + (tmpFiles === 1 ? ' file, ' : ' files, ')
			+ '+' + tmpAdds + ', -' + tmpDels;
	}

	function runVersion(pName, pKind)
	{
		apiPost('/modules/' + encodeURIComponent(pName) + '/operations/version', { Kind: pKind }).then(
			function (pBody) { beginOperation(pBody.OperationId, 'version'); },
			function (pError) { setStatus('Version bump failed: ' + pError.message); });
	}

	function cancelActive()
	{
		if (!_activeOperationId) { return; }
		let tmpId = _activeOperationId;
		apiPost('/operations/' + encodeURIComponent(tmpId) + '/cancel', {}).then(
			function () { appendOutput('meta', '  (cancel requested)'); },
			function (pError) { appendOutput('stderr', 'cancel failed: ' + pError.message); });
	}

	// ─────────────────────────────────────────────
	//  Commit modal
	// ─────────────────────────────────────────────

	function openCommitModal(pName)
	{
		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop';
		tmpBackdrop.innerHTML =
			'<div class="modal">'
			+ '<h3>Commit — ' + escapeHtml(pName) + '</h3>'
			+ '<p style="color:var(--color-muted);font-size:12px;margin:0 0 10px">Runs <code>git commit -a -m &lt;message&gt;</code>.</p>'
			+ '<textarea id="RM-CommitMessage" placeholder="Commit message"></textarea>'
			+ '<div class="modal-actions">'
			+ '  <button class="action" data-act="cancel">Cancel</button>'
			+ '  <button class="action primary" data-act="submit">Commit</button>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);
		let tmpTextarea = tmpBackdrop.querySelector('#RM-CommitMessage');
		tmpTextarea.focus();

		function close() { tmpBackdrop.remove(); }

		tmpBackdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
		tmpBackdrop.querySelector('[data-act="submit"]').addEventListener('click', function ()
			{
				let tmpMessage = tmpTextarea.value.trim();
				if (tmpMessage.length === 0) { tmpTextarea.focus(); return; }
				close();
				apiPost('/modules/' + encodeURIComponent(pName) + '/operations/commit',
					{ Message: tmpMessage }).then(
					function (pBody) { beginOperation(pBody.OperationId, 'commit'); },
					function (pError) { setStatus('Commit failed: ' + pError.message); });
			});

		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});
	}

	// ─────────────────────────────────────────────
	//  Publish modal (preview → confirm)
	// ─────────────────────────────────────────────

	function openPublishModal(pName)
	{
		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop';
		tmpBackdrop.innerHTML =
			'<div class="modal" style="min-width:640px">'
			+ '<h3>Publish — ' + escapeHtml(pName) + '</h3>'
			+ '<p style="color:var(--color-muted);font-size:12px;margin:0 0 6px">Loading pre-publish validation...</p>'
			+ '<div class="preview-panel" id="RM-PreviewPanel"><em>running npm queries (parallel)...</em></div>'
			+ '<div class="modal-actions">'
			+ '  <button class="action" data-act="cancel">Close</button>'
			+ '  <button class="action success" data-act="submit" disabled>Publish to npm</button>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);

		let tmpSubmit = tmpBackdrop.querySelector('[data-act="submit"]');
		function close() { tmpBackdrop.remove(); }

		tmpBackdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});

		apiGet('/modules/' + encodeURIComponent(pName) + '/publish/preview').then(
			function (pReport)
				{
					_activePreviewHash = pReport.PreviewHash;
					let tmpPreview = document.getElementById('RM-PreviewPanel');
					tmpPreview.innerHTML = renderPreview(pReport);

					if (pReport.OkToPublish)
					{
						tmpSubmit.disabled = false;
						tmpSubmit.addEventListener('click', function ()
							{
								tmpSubmit.disabled = true;
								apiPost('/modules/' + encodeURIComponent(pName) + '/operations/publish',
									{
										Confirm: true,
										PreviewHash: pReport.PreviewHash,
									}).then(
									function (pBody)
										{
											close();
											beginOperation(pBody.OperationId, 'publish');
										},
									function (pError)
										{
											tmpSubmit.disabled = false;
											appendPreviewError(pError);
										});
							});
					}
				},
			function (pError)
				{
					let tmpPreview = document.getElementById('RM-PreviewPanel');
					tmpPreview.innerHTML = '<span style="color:var(--color-danger)">Preview failed: '
						+ escapeHtml(pError.message) + '</span>';
				});

		function appendPreviewError(pError)
		{
			let tmpPreview = document.getElementById('RM-PreviewPanel');
			let tmpLine = document.createElement('div');
			tmpLine.style.marginTop = '8px';
			tmpLine.style.color = 'var(--color-danger)';
			tmpLine.textContent = '✗ ' + (pError.Info && pError.Info.Error ? pError.Info.Error + ': ' : '')
				+ pError.message;
			tmpPreview.appendChild(tmpLine);
		}
	}

	function renderPreview(pReport)
	{
		let tmpHtml = '';

		let tmpVerdict = pReport.OkToPublish
			? '<span class="preview-verdict ok">✓ Ready to publish</span>'
			: '<span class="preview-verdict block">✗ Not publishable</span>';
		tmpHtml += tmpVerdict + '<br>';

		tmpHtml += '<strong>Package:</strong> ' + escapeHtml(pReport.Package) + '<br>';
		tmpHtml += '<strong>Local:</strong> v' + escapeHtml(pReport.LocalVersion) + '<br>';
		if (pReport.PublishedVersion)
		{
			tmpHtml += '<strong>npm:</strong> v' + escapeHtml(pReport.PublishedVersion) + '<br>';
		}
		else
		{
			tmpHtml += '<strong>npm:</strong> <em>(not yet published)</em><br>';
		}

		if (pReport.Problems.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Problems:</strong>';
			for (let i = 0; i < pReport.Problems.length; i++)
			{
				let tmpP = pReport.Problems[i];
				let tmpCls = tmpP.Severity === 'error' ? 'stale' : 'warn';
				tmpHtml += '<div class="dep ' + tmpCls + '">' + escapeHtml(tmpP.Message) + '</div>';
			}
			tmpHtml += '</div>';
		}

		if (pReport.EcosystemDeps.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Ecosystem deps ('
				+ pReport.EcosystemDeps.length + '):</strong>';
			for (let i = 0; i < pReport.EcosystemDeps.length; i++)
			{
				let tmpD = pReport.EcosystemDeps[i];
				let tmpCls, tmpMark;
				if (tmpD.LocalLink)   { tmpCls = 'link';  tmpMark = '↳'; }
				else if (tmpD.Error)  { tmpCls = 'warn';  tmpMark = '?'; }
				else if (tmpD.CoversLatest) { tmpCls = 'ok'; tmpMark = '✓'; }
				else                  { tmpCls = 'stale'; tmpMark = '✗'; }

				let tmpSuffix = tmpD.LocalLink
					? '(local link)'
					: (tmpD.Error
						? '(could not fetch from npm)'
						: ('latest: ' + (tmpD.LatestOnNpm || '—')));

				tmpHtml += '<div class="dep ' + tmpCls + '">'
					+ tmpMark + ' ' + escapeHtml(tmpD.Name)
					+ '  ' + escapeHtml(tmpD.Range)
					+ '  ' + tmpSuffix + '</div>';
			}
			tmpHtml += '</div>';
		}

		if (pReport.CommitsSincePublish.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Recent commits:</strong>';
			for (let i = 0; i < pReport.CommitsSincePublish.length; i++)
			{
				let tmpC = pReport.CommitsSincePublish[i];
				tmpHtml += '<div class="dep link">' + escapeHtml(tmpC.Hash) + ' ' + escapeHtml(tmpC.Subject) + '</div>';
			}
			tmpHtml += '</div>';
		}

		return tmpHtml;
	}

	// ─────────────────────────────────────────────
	//  Log viewer (mode: 'log')
	// ─────────────────────────────────────────────

	// The log is now a full-screen modal overlay — workspace content stays
	// behind it so the user can close and resume where they were. Matches
	// the pict-section-modal pattern we'll switch to once the client bundle
	// moves to pict-application.
	let _logModalOpen = false;

	function openLogModal()
	{
		if (_logModalOpen) { return; }
		_logModalOpen = true;
		elLogToggle.textContent = '✕ Close log';

		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop log-modal';
		tmpBackdrop.innerHTML =
			'<div class="modal">'
			+ '<div class="log-viewer">'
			+ '<h2>Operation log <span class="subtle" id="RM-LogPath" style="margin-left:12px;font-size:11px">loading...</span></h2>'
			+ '<div class="action-row" style="margin:0 0 10px">'
			+ '  <button class="action" data-act="log-refresh">↻ Refresh</button>'
			+ '  <button class="action" data-act="log-tail-2000">Last 2000 lines</button>'
			+ '  <button class="action" data-act="log-tail-500">Last 500 lines</button>'
			+ '  <button class="action" data-act="close" style="margin-left:auto">✕ Close</button>'
			+ '</div>'
			+ '<pre id="RM-LogBody">fetching...</pre>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);

		function close()
		{
			tmpBackdrop.remove();
			_logModalOpen = false;
			elLogToggle.textContent = '📜 Log';
		}

		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});

		let tmpButtons = tmpBackdrop.querySelectorAll('button[data-act]');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', function (pEvent)
				{
					let tmpAct = pEvent.currentTarget.getAttribute('data-act');
					if (tmpAct === 'close')         { return close(); }
					if (tmpAct === 'log-refresh')   { return loadLog(500); }
					if (tmpAct === 'log-tail-2000') { return loadLog(2000); }
					if (tmpAct === 'log-tail-500')  { return loadLog(500); }
				});
		}

		// One-shot Esc handler while modal is open
		function onKey(pEvent)
		{
			if (pEvent.key === 'Escape')
			{
				document.removeEventListener('keydown', onKey);
				close();
			}
		}
		document.addEventListener('keydown', onKey);

		loadLog(500);
	}

	function loadLog(pTail)
	{
		setStatus('Loading log...');
		apiGet('/log?tail=' + pTail).then(
			function (pBody)
				{
					let tmpPath = document.getElementById('RM-LogPath');
					if (tmpPath)
					{
						tmpPath.textContent = pBody.Exists
							? pBody.Path + ' — showing last ' + pBody.Lines.length + ' of ' + pBody.Total + ' lines'
							: pBody.Path + ' — (not yet written; no ops run today)';
					}
					let tmpBody = document.getElementById('RM-LogBody');
					if (!tmpBody) { return; }
					if (!pBody.Lines || pBody.Lines.length === 0)
					{
						tmpBody.textContent = '(empty)';
					}
					else
					{
						tmpBody.innerHTML = pBody.Lines.map(formatLogLine).join('\n');
						tmpBody.scrollTop = tmpBody.scrollHeight;
					}
					setStatus('Log loaded (' + pBody.Lines.length + ' lines).');
				},
			function (pError)
				{
					let tmpBody = document.getElementById('RM-LogBody');
					if (tmpBody) { tmpBody.textContent = 'Error: ' + pError.message; }
					setStatus('Log load failed.');
				});
	}

	function formatLogLine(pLine)
	{
		let tmpSafe = escapeHtml(pLine);
		if (pLine.indexOf('] RIPPLE ') !== -1) { return '<span class="line-rip">' + tmpSafe + '</span>'; }
		if (pLine.indexOf('] err   ') !== -1 || pLine.indexOf('] ERROR ') !== -1)
			{ return '<span class="line-err">' + tmpSafe + '</span>'; }
		if (pLine.indexOf('] START ') !== -1 || pLine.indexOf('] END   ') !== -1)
			{ return '<span class="line-meta">' + tmpSafe + '</span>'; }
		return '<span class="line-out">' + tmpSafe + '</span>';
	}

	// ─────────────────────────────────────────────
	//  NCU modal (npm-check-updates)
	// ─────────────────────────────────────────────

	function openNcuModal(pName)
	{
		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop';
		tmpBackdrop.innerHTML =
			'<div class="modal" style="min-width:520px">'
			+ '<h3>npm-check-updates — ' + escapeHtml(pName) + '</h3>'
			+ '<p style="color:var(--color-muted);font-size:12px;margin:0 0 12px">'
			+ '<strong>Check</strong> lists outdated packages. <strong>Apply</strong> runs '
			+ '<code>ncu -u</code> (updates package.json) and then <code>npm install</code>. '
			+ '<strong>Retold scope</strong> filters to ecosystem modules only; <strong>All</strong> '
			+ 'includes every dep. Output streams in the workspace.'
			+ '</p>'
			+ '<div class="form-row"><label>Scope</label>'
			+ '  <div>'
			+ '    <label style="font-family:var(--font-sans);color:var(--color-text)"><input type="radio" name="ncu-scope" value="retold" checked style="width:auto;margin-right:6px"> Retold ecosystem only</label><br>'
			+ '    <label style="font-family:var(--font-sans);color:var(--color-text)"><input type="radio" name="ncu-scope" value="all" style="width:auto;margin-right:6px"> All dependencies</label>'
			+ '  </div></div>'
			+ '<div class="modal-actions">'
			+ '  <button class="action" data-act="cancel">Cancel</button>'
			+ '  <button class="action primary" data-act="check">Check</button>'
			+ '  <button class="action success" data-act="apply">Apply (update + install)</button>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);

		function close() { tmpBackdrop.remove(); }
		function getScope()
		{
			let tmpChecked = tmpBackdrop.querySelector('input[name="ncu-scope"]:checked');
			return tmpChecked ? tmpChecked.value : 'retold';
		}

		tmpBackdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});

		function runNcu(pApply)
		{
			let tmpScope = getScope();
			close();
			apiPost('/modules/' + encodeURIComponent(pName) + '/operations/ncu',
				{ Apply: pApply, Scope: tmpScope }).then(
				function (pBody) { beginOperation(pBody.OperationId, pApply ? 'ncu-apply' : 'ncu-check'); },
				function (pError) { setStatus('NCU failed: ' + pError.message); });
		}

		tmpBackdrop.querySelector('[data-act="check"]').addEventListener('click', function () { runNcu(false); });
		tmpBackdrop.querySelector('[data-act="apply"]').addEventListener('click', function () { runNcu(true); });
	}

	// ─────────────────────────────────────────────
	//  Ripple sequencer (mode: 'ripple')
	// ─────────────────────────────────────────────

	let _activeRipple = null;     // { RippleId, Plan, Steps: [{Order, Status, CurrentAction, ActionResults}], PauseReport? }

	function openRipplePlanner(pRoot)
	{
		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop';
		tmpBackdrop.innerHTML =
			'<div class="modal" style="min-width:640px;max-width:780px">'
			+ '<h3>Plan ripple from ' + escapeHtml(pRoot) + '</h3>'
			+ '<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 10px">'
			+ 'Computes the ordered sequence of bumps, commits, and publishes required to propagate '
			+ 'a new version of <strong>' + escapeHtml(pRoot) + '</strong> through every ecosystem consumer.'
			+ '</p>'
			+ '<div class="form-row"><label>Target version</label>'
			+ '  <input type="text" id="RM-R-Version" placeholder="(defaults to current local version)"></div>'
			+ '<div class="form-row"><label>Range prefix</label>'
			+ '  <input type="text" id="RM-R-Prefix" value="^"></div>'
			+ '<div class="form-row"><label>Consumer bump</label>'
			+ '  <input type="text" id="RM-R-Bump" value="patch" placeholder="patch / minor / major"></div>'
			+ '<div class="form-row"><label>Include devDeps</label>'
			+ '  <input type="checkbox" id="RM-R-IncludeDev" style="width:auto">'
			+ '  <span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">'
			+ '    (off by default — devDep cycles from test harnesses produce fallback ordering)'
			+ '  </span></div>'
			+ '<div class="form-row"><label>Stop at apps</label>'
			+ '  <input type="checkbox" id="RM-R-StopAtApps" checked style="width:auto"></div>'
			+ '<div class="form-row"><label>Run npm install</label>'
			+ '  <input type="checkbox" id="RM-R-Install" checked style="width:auto"></div>'
			+ '<div class="form-row"><label>Run tests</label>'
			+ '  <input type="checkbox" id="RM-R-Test" checked style="width:auto"></div>'
			+ '<div class="form-row"><label>Push after publish</label>'
			+ '  <input type="checkbox" id="RM-R-Push" checked style="width:auto">'
			+ '  <span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">'
			+ '    (<code>git push</code> after the commit-final; otherwise the module stays ↑N in the scan)'
			+ '  </span></div>'
			+ '<div class="form-row"><label>Bring retold deps forward</label>'
			+ '  <input type="checkbox" id="RM-R-BringForward" style="width:auto">'
			+ '  <span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">'
			+ '    (<code>ncu -u --filter &lt;retold&gt;</code> before each consumer step)'
			+ '  </span></div>'
			+ '<div id="RM-R-Result" style="margin-top:12px"></div>'
			+ '<div class="modal-actions">'
			+ '  <button class="action" data-act="cancel">Cancel</button>'
			+ '  <button class="action primary" data-act="plan">Compute plan</button>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);
		tmpBackdrop.querySelector('#RM-R-Version').focus();

		function close() { tmpBackdrop.remove(); }
		tmpBackdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});

		tmpBackdrop.querySelector('[data-act="plan"]').addEventListener('click', function ()
			{
				let tmpOpts =
					{
						Root: pRoot,
						TargetVersion: tmpBackdrop.querySelector('#RM-R-Version').value.trim() || undefined,
						RangePrefix: tmpBackdrop.querySelector('#RM-R-Prefix').value.trim() || '^',
						ConsumerBumpKind: tmpBackdrop.querySelector('#RM-R-Bump').value.trim() || 'patch',
						IncludeDev: tmpBackdrop.querySelector('#RM-R-IncludeDev').checked,
						StopAtApps: tmpBackdrop.querySelector('#RM-R-StopAtApps').checked,
						RunInstall: tmpBackdrop.querySelector('#RM-R-Install').checked,
						RunTest:    tmpBackdrop.querySelector('#RM-R-Test').checked,
						RunPush:    tmpBackdrop.querySelector('#RM-R-Push').checked,
						BringRetoldDepsForward: tmpBackdrop.querySelector('#RM-R-BringForward').checked,
					};
				let tmpResult = tmpBackdrop.querySelector('#RM-R-Result');
				tmpResult.innerHTML = '<em>computing plan...</em>';
				apiPost('/ripple/plan', tmpOpts).then(
					function (pPlan)
						{
							close();
							enterRippleMode(pPlan);
						},
					function (pError)
						{
							tmpResult.innerHTML = '<div style="color:var(--color-danger)">Plan failed: '
								+ escapeHtml(pError.message) + '</div>';
						});
			});
	}

	function enterRippleMode(pPlan)
	{
		_mode = 'ripple';
		elManifestToggle.textContent = '⚙ Manifest';
		_activeRipple =
			{
				RippleId: null,
				Plan: pPlan,
				Steps: pPlan.Steps.map(function (pS)
					{
						return {
							Order: pS.Order,
							Module: pS.Module,
							Status: 'pending',
							CurrentAction: -1,
							ActionStates: pS.Actions.map(function () { return 'pending'; }),
							ActionResults: [],
							PauseReport: null,
							// Lines captured from ProcessRunner for this step
							// (each entry: { Kind: 'stdout'|'stderr'|'meta'|'action'|'success'|'error', Text }).
							Output: [],
							ShowOutput: false,
						};
					}),
				Status: 'draft',
				StartButtonEnabled: true,
			};
		renderRippleView();
	}

	function appendStepOutput(pStepOrder, pKind, pText)
	{
		let tmpStep = _activeRipple.Steps[pStepOrder];
		if (!tmpStep) { return; }
		tmpStep.Output.push({ Kind: pKind, Text: pText });
		// Cap to something reasonable to avoid runaway memory in the client.
		if (tmpStep.Output.length > 2000) { tmpStep.Output.splice(0, tmpStep.Output.length - 2000); }
	}

	/**
	 * Re-render only the per-step output block in place, so we don't reflow
	 * the whole timeline on every stdout frame. Called after append.
	 */
	function renderRippleStepOutput(pStepOrder)
	{
		let tmpStep = _activeRipple.Steps[pStepOrder];
		if (!tmpStep) { return; }
		let tmpPanel = document.querySelector('.ripple-step[data-order="' + pStepOrder + '"] .step-output-body');
		if (!tmpPanel) { return; }
		tmpPanel.innerHTML = renderStepOutputLines(tmpStep);
		tmpPanel.scrollTop = tmpPanel.scrollHeight;
	}

	function renderStepOutputLines(pStep)
	{
		if (!pStep.Output || pStep.Output.length === 0)
		{
			return '<div class="diff-line meta">(no output yet)</div>';
		}
		let tmpParts = [];
		for (let i = 0; i < pStep.Output.length; i++)
		{
			let tmpLine = pStep.Output[i];
			let tmpCls = 'line';
			if (tmpLine.Kind === 'stderr') { tmpCls += ' stderr'; }
			else if (tmpLine.Kind === 'meta' || tmpLine.Kind === 'action') { tmpCls += ' meta'; }
			else if (tmpLine.Kind === 'success') { tmpCls += ' success'; }
			else if (tmpLine.Kind === 'error')   { tmpCls += ' error'; }
			tmpParts.push('<span class="' + tmpCls + '">' + escapeHtml(tmpLine.Text) + '</span>');
		}
		return tmpParts.join('\n');
	}

	function exitRippleMode()
	{
		_mode = 'workspace';
		_activeRipple = null;
		elWorkspace.innerHTML = '<div class="placeholder"><h2>Select a module</h2></div>';
	}

	function renderRippleView()
	{
		if (!_activeRipple) { return; }
		let tmpPlan = _activeRipple.Plan;
		let tmpSteps = _activeRipple.Steps;

		let tmpHtml = '<div class="ripple-plan">';
		tmpHtml += '<div class="ripple-header">';
		tmpHtml += '  <span class="title">Ripple: <span class="target">' + escapeHtml(tmpPlan.Root)
			+ '</span> → v' + escapeHtml(tmpPlan.TargetVersion) + '</span>';
		tmpHtml += '  <span class="meta">' + tmpSteps.length + ' steps · '
			+ (tmpPlan.Options.ConsumerBumpKind || 'patch') + ' bump</span>';
		tmpHtml += '</div>';

		// Top controls
		tmpHtml += '<div class="action-row" style="margin-bottom:12px">';
		if (_activeRipple.Status === 'draft')
		{
			tmpHtml += '<button class="action primary" data-act="ripple-start">▶ Start ripple</button>';
		}
		if (_activeRipple.Status === 'running' || _activeRipple.Status === 'paused' || _activeRipple.Status === 'starting')
		{
			tmpHtml += '<button class="action danger" data-act="ripple-cancel">Cancel ripple</button>';
		}
		tmpHtml += '<button class="action" data-act="ripple-exit">← Back to workspace</button>';
		tmpHtml += '</div>';

		// Timeline
		tmpHtml += '<div class="ripple-timeline">';
		for (let i = 0; i < tmpSteps.length; i++)
		{
			let tmpStep = tmpSteps[i];
			let tmpPlanStep = tmpPlan.Steps[i];
			tmpHtml += renderRippleStep(tmpStep, tmpPlanStep);
		}
		tmpHtml += '</div>';
		tmpHtml += '</div>';

		elWorkspace.innerHTML = tmpHtml;
		wireRippleButtons();
	}

	function renderRippleStep(pState, pPlanStep)
	{
		let tmpStatusText =
			{
				pending:   'pending',
				running:   'running',
				paused:    'paused · awaiting confirm',
				complete:  '✓ done',
				failed:    '✗ failed',
				cancelled: '— cancelled',
			}[pState.Status] || pState.Status;

		let tmpHtml = '<div class="ripple-step ' + pState.Status + '" data-order="' + pState.Order + '">';
		tmpHtml += '  <div class="step-row">';
		tmpHtml += '    <span class="step-order">' + (pState.Order + 1) + '.</span>';
		tmpHtml += '    <span class="step-module">' + escapeHtml(pState.Module) + '</span>';
		tmpHtml += '    <span class="step-kind">' + escapeHtml(pPlanStep.Kind) + ' · ' + escapeHtml(pPlanStep.Group) + '</span>';
		tmpHtml += '    <span class="step-status">' + tmpStatusText + '</span>';
		tmpHtml += '  </div>';

		tmpHtml += '  <div class="step-actions">';
		for (let i = 0; i < pPlanStep.Actions.length; i++)
		{
			let tmpAction = pPlanStep.Actions[i];
			let tmpActionState = pState.ActionStates[i] || 'pending';
			let tmpCls = ' ' + tmpActionState;
			tmpHtml += '<span class="step-action' + tmpCls + '">' + formatActionLabel(tmpAction) + '</span>';
		}
		tmpHtml += '  </div>';

		if (pState.Status === 'paused' && pState.PauseReport)
		{
			let tmpReport = pState.PauseReport;
			tmpHtml += '  <div class="step-approve">';
			tmpHtml += '    <span class="hint">Publish confirmation required — '
				+ escapeHtml(tmpReport.Package) + ' v'
				+ escapeHtml(tmpReport.LocalVersion) + '</span>';
			if (tmpReport.OkToPublish)
			{
				tmpHtml += '    <button class="action success" data-act="ripple-approve" data-order="'
					+ pState.Order + '">Approve & publish</button>';
			}
			else
			{
				tmpHtml += '    <span style="color:var(--color-danger)">Pre-publish validation failed; ripple will halt.</span>';
			}
			tmpHtml += '  </div>';
		}

		// Per-step output — auto-expanded for running / failed steps, collapsed
		// by default for pending / completed steps. This is the "I need to see
		// why npm install failed" affordance.
		let tmpAutoExpand = (pState.Status === 'running' || pState.Status === 'failed' || pState.ShowOutput);
		if ((pState.Output && pState.Output.length > 0) || pState.Status === 'running')
		{
			tmpHtml += '  <div class="step-output' + (tmpAutoExpand ? ' open' : '') + '">';
			tmpHtml += '    <button class="step-output-toggle" data-act="ripple-toggle-output" data-order="'
				+ pState.Order + '">'
				+ (tmpAutoExpand ? '▾' : '▸') + ' output ('
				+ (pState.Output ? pState.Output.length : 0) + ' lines)'
				+ '</button>';
			tmpHtml += '    <pre class="step-output-body">' + renderStepOutputLines(pState) + '</pre>';
			tmpHtml += '  </div>';
		}

		tmpHtml += '</div>';
		return tmpHtml;
	}

	function formatActionLabel(pAction)
	{
		switch (pAction.Op)
		{
			case 'update-dep':
			{
				let tmpTarget = pAction.Range
					? pAction.Range
					: ((pAction.RangePrefix || '^') + 'latest');
				return 'update ' + pAction.Dep + ' (' + (pAction.OldRange || '?') + ' → ' + tmpTarget + ')';
			}
			case 'preflight-clean-tree': return 'preflight (clean tree)';
			case 'ncu-retold':           return 'ncu -u (retold)';
			case 'install':              return 'npm install';
			case 'test':                 return 'npm test';
			case 'commit':               return 'git commit (deps)';
			case 'bump':                 return 'bump ' + (pAction.Kind || 'patch');
			case 'publish':              return 'npm publish';
			case 'commit-final':         return 'git commit (post-publish)';
			case 'push':                 return 'git push';
			default:                     return pAction.Op;
		}
	}

	function wireRippleButtons()
	{
		let tmpButtons = elWorkspace.querySelectorAll('button[data-act]');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', function (pEvent)
				{
					let tmpAct = pEvent.currentTarget.getAttribute('data-act');
					let tmpOrder = pEvent.currentTarget.getAttribute('data-order');

					switch (tmpAct)
					{
						case 'ripple-start':         return startRipple();
						case 'ripple-cancel':        return cancelRipple();
						case 'ripple-exit':          return exitRippleMode();
						case 'ripple-approve':       return approveRippleStep(parseInt(tmpOrder, 10));
						case 'ripple-toggle-output': return toggleRippleStepOutput(parseInt(tmpOrder, 10));
					}
				});
		}
	}

	function startRipple()
	{
		if (!_activeRipple) { return; }
		_activeRipple.Status = 'starting';
		renderRippleView();

		apiPost('/ripple/run', { Plan: _activeRipple.Plan }).then(
			function (pBody)
				{
					_activeRipple.RippleId = pBody.RippleId;
					_activeRipple.Status = 'running';
					renderRippleView();
				},
			function (pError)
				{
					_activeRipple.Status = 'failed';
					_activeRipple.Error = pError.message;
					renderRippleView();
					setStatus('Ripple start failed: ' + pError.message);
				});
	}

	function cancelRipple()
	{
		if (!_activeRipple || !_activeRipple.RippleId) { return; }
		apiPost('/ripple/' + encodeURIComponent(_activeRipple.RippleId) + '/cancel', {});
	}

	function toggleRippleStepOutput(pOrder)
	{
		let tmpStep = _activeRipple.Steps[pOrder];
		if (!tmpStep) { return; }
		tmpStep.ShowOutput = !tmpStep.ShowOutput;
		renderRippleView();
	}

	function approveRippleStep(pOrder)
	{
		if (!_activeRipple || !_activeRipple.RippleId) { return; }
		let tmpState = _activeRipple.Steps[pOrder];
		if (!tmpState || !tmpState.PauseReport) { return; }

		let tmpHash = tmpState.PauseReport.PreviewHash;
		// Optimistically clear the pause UI so the button disappears the
		// instant the user clicks. The server frames that arrive next will
		// reconcile with authoritative state (running → complete/failed).
		tmpState.PauseReport = null;
		tmpState.Status = 'running';
		_activeRipple.Status = 'running';
		renderRippleView();

		apiPost('/ripple/' + encodeURIComponent(_activeRipple.RippleId) + '/confirm',
			{
				StepOrder: pOrder,
				Action: 'publish',
				PreviewHash: tmpHash,
			}).catch(function (pError) { setStatus('Approve failed: ' + pError.message); });
	}

	// ─────────────────────────────────────────────
	//  Ripple WS frame handlers
	// ─────────────────────────────────────────────

	function handleRippleFrame(pFrame)
	{
		if (!_activeRipple) { return; }
		if (pFrame.RippleId && _activeRipple.RippleId && pFrame.RippleId !== _activeRipple.RippleId) { return; }

		switch (pFrame.Type)
		{
			case 'ripple-start':
				_activeRipple.Status = 'running';
				renderRippleView();
				break;
			case 'ripple-step-start':
				_activeRipple.Steps[pFrame.StepOrder].Status = 'running';
				renderRippleView();
				break;
			case 'ripple-action-start':
				_activeRipple.Steps[pFrame.StepOrder].CurrentAction = pFrame.ActionIndex;
				_activeRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'current';
				// Separator in the per-step output so each action's output is visually bracketed.
				appendStepOutput(pFrame.StepOrder, 'action',
					'── ' + formatActionLabel(pFrame.Action) + ' ──');
				renderRippleView();
				break;
			case 'ripple-action-end':
				_activeRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'done';
				_activeRipple.Steps[pFrame.StepOrder].ActionResults[pFrame.ActionIndex] = pFrame.Result;
				renderRippleView();
				break;
			case 'ripple-paused':
				_activeRipple.Status = 'paused';
				_activeRipple.Steps[pFrame.StepOrder].Status = 'paused';
				_activeRipple.Steps[pFrame.StepOrder].PauseReport = pFrame.PreviewReport;
				renderRippleView();
				break;
			case 'ripple-step-complete':
				_activeRipple.Steps[pFrame.StepOrder].Status = 'complete';
				renderRippleView();
				break;
			case 'ripple-complete':
				_activeRipple.Status = 'complete';
				renderRippleView();
				setStatus('Ripple complete.');
				break;
			case 'ripple-failed':
				_activeRipple.Status = 'failed';
				if (typeof pFrame.StepOrder === 'number' && _activeRipple.Steps[pFrame.StepOrder])
				{
					_activeRipple.Steps[pFrame.StepOrder].Status = 'failed';
					if (typeof pFrame.ActionIndex === 'number' && pFrame.ActionIndex >= 0)
					{
						_activeRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'failed';
					}
				}
				renderRippleView();
				setStatus('Ripple failed: ' + pFrame.Error);
				break;
			case 'ripple-cancelled':
				_activeRipple.Status = 'cancelled';
				for (let i = 0; i < _activeRipple.Steps.length; i++)
				{
					if (_activeRipple.Steps[i].Status === 'pending' || _activeRipple.Steps[i].Status === 'running' || _activeRipple.Steps[i].Status === 'paused')
					{
						_activeRipple.Steps[i].Status = 'cancelled';
					}
				}
				renderRippleView();
				setStatus('Ripple cancelled.');
				break;
		}
	}

	// ─────────────────────────────────────────────
	//  Manifest editor (mode: 'manifest')
	// ─────────────────────────────────────────────

	function enterManifestMode()
	{
		_mode = 'manifest';
		elManifestToggle.textContent = '✕ Close manifest';
		_selectedModule = null;
		renderSidebar();
		renderManifestEditor();
	}

	function exitManifestMode()
	{
		_mode = 'workspace';
		elManifestToggle.textContent = '⚙ Manifest';
		elWorkspace.innerHTML = '<div class="placeholder"><h2>Select a module</h2></div>';
	}

	function renderManifestEditor()
	{
		elWorkspace.innerHTML = '<div class="manifest-editor">'
			+ '<h2>Manifest editor <span class="audit-badge" id="RM-AuditBadge">auditing...</span></h2>'
			+ '<p class="subtle">Edits save directly to <code>Retold-Modules-Manifest.json</code>. '
			+ 'Every change rewrites the file atomically (tmp + rename) and the sidebar re-syncs.</p>'
			+ '<div id="RM-ManifestGroups">loading...</div>'
			+ '</div>';

		setStatus('Loading manifest...');
		Promise.all(
			[
				apiGet('/manifest'),
				apiGet('/manifest/audit'),
			]).then(
			function (pResults)
				{
					let tmpManifest = pResults[0];
					let tmpAudit = pResults[1];
					renderAuditBadge(tmpAudit);
					renderManifestGroups(tmpManifest, tmpAudit);
					setStatus('Manifest loaded. ' + tmpAudit.Totals.Manifest + ' modules (disk: '
						+ tmpAudit.Totals.Disk + ').');
				},
			function (pError)
				{
					document.getElementById('RM-ManifestGroups').innerHTML =
						'<p class="loading">Error loading manifest: ' + escapeHtml(pError.message) + '</p>';
					setStatus('Manifest load failed.');
				});
	}

	function renderAuditBadge(pAudit)
	{
		let tmpBadge = document.getElementById('RM-AuditBadge');
		if (!tmpBadge) { return; }
		if (pAudit.Clean)
		{
			tmpBadge.className = 'audit-badge ok';
			tmpBadge.textContent = '✓ in sync with disk';
		}
		else
		{
			tmpBadge.className = 'audit-badge drift';
			tmpBadge.textContent = '! drift: '
				+ pAudit.Drift.ManifestMissing + ' missing, '
				+ pAudit.Drift.ManifestOrphaned + ' orphaned';
		}
	}

	function renderManifestGroups(pManifest, pAudit)
	{
		let tmpAuditByGroup = {};
		for (let i = 0; i < pAudit.Groups.length; i++)
		{
			tmpAuditByGroup[pAudit.Groups[i].Name] = pAudit.Groups[i];
		}

		let tmpHtml = '';
		for (let i = 0; i < pManifest.Groups.length; i++)
		{
			let tmpGroup = pManifest.Groups[i];
			let tmpGroupAudit = tmpAuditByGroup[tmpGroup.Name] || { ManifestMissing: [], ManifestOrphaned: [] };
			let tmpOrphanSet = new Set(tmpGroupAudit.ManifestOrphaned);

			tmpHtml += '<div class="group-card">';
			tmpHtml += '  <div class="group-card-header">';
			tmpHtml += '    <span class="name">' + escapeHtml(tmpGroup.Name) + '</span>';
			tmpHtml += '    <span class="desc">' + escapeHtml(tmpGroup.Description || '') + '</span>';
			tmpHtml += '    <button class="action" data-act="add-module" data-group="'
				+ escapeHtml(tmpGroup.Name) + '">+ Add module</button>';
			tmpHtml += '  </div>';

			tmpHtml += '<table class="module-table">';
			tmpHtml += '<thead><tr>'
				+ '<th style="width:28%">Name</th>'
				+ '<th style="width:44%">Description</th>'
				+ '<th>Status</th>'
				+ '<th></th>'
				+ '</tr></thead><tbody>';

			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				let tmpModule = tmpGroup.Modules[j];
				let tmpIsOrphan = tmpOrphanSet.has(tmpModule.Name);
				tmpHtml += '<tr' + (tmpIsOrphan ? ' class="orphan"' : '') + '>';
				tmpHtml += '<td>' + escapeHtml(tmpModule.Name) + '</td>';
				tmpHtml += '<td>' + escapeHtml(tmpModule.Description || '') + '</td>';
				tmpHtml += '<td>' + (tmpIsOrphan ? 'missing on disk' : '—') + '</td>';
				tmpHtml += '<td class="actions">'
					+ '<button data-act="edit-module" data-group="' + escapeHtml(tmpGroup.Name)
					+ '" data-name="' + escapeHtml(tmpModule.Name) + '">edit</button>'
					+ '<button class="danger" data-act="delete-module" data-name="'
					+ escapeHtml(tmpModule.Name) + '">delete</button>'
					+ '</td>';
				tmpHtml += '</tr>';
			}

			// Also surface disk modules that AREN'T in the manifest (so user can
			// promote them easily — shows up as an "add from disk" hint).
			for (let j = 0; j < tmpGroupAudit.ManifestMissing.length; j++)
			{
				let tmpDiskOnly = tmpGroupAudit.ManifestMissing[j];
				tmpHtml += '<tr class="orphan">';
				tmpHtml += '<td><em>' + escapeHtml(tmpDiskOnly) + '</em></td>';
				tmpHtml += '<td><em>not in manifest (present on disk)</em></td>';
				tmpHtml += '<td>disk-only</td>';
				tmpHtml += '<td class="actions">'
					+ '<button data-act="add-from-disk" data-group="' + escapeHtml(tmpGroup.Name)
					+ '" data-name="' + escapeHtml(tmpDiskOnly) + '">+ add to manifest</button>'
					+ '</td>';
				tmpHtml += '</tr>';
			}

			tmpHtml += '</tbody></table>';
			tmpHtml += '</div>';
		}

		let tmpContainer = document.getElementById('RM-ManifestGroups');
		tmpContainer.innerHTML = tmpHtml;
		wireManifestButtons(pManifest);
	}

	function wireManifestButtons(pManifest)
	{
		let tmpButtons = document.querySelectorAll('#RM-ManifestGroups button');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', function (pEvent)
				{
					let tmpAct = pEvent.currentTarget.getAttribute('data-act');
					let tmpGroup = pEvent.currentTarget.getAttribute('data-group');
					let tmpName = pEvent.currentTarget.getAttribute('data-name');

					switch (tmpAct)
					{
						case 'edit-module':   return openModuleEditor(pManifest, tmpGroup, tmpName);
						case 'delete-module': return deleteModule(tmpName);
						case 'add-module':    return openModuleEditor(pManifest, tmpGroup, null);
						case 'add-from-disk': return openModuleEditor(pManifest, tmpGroup, null, tmpName);
					}
				});
		}
	}

	function findModuleInManifest(pManifest, pName)
	{
		for (let i = 0; i < pManifest.Groups.length; i++)
		{
			let tmpGroup = pManifest.Groups[i];
			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				if (tmpGroup.Modules[j].Name === pName)
				{
					return { Group: tmpGroup.Name, Entry: tmpGroup.Modules[j] };
				}
			}
		}
		return null;
	}

	/**
	 * Open the edit/add modal.
	 *   pPrefill is the existing entry when editing, or null when adding.
	 *   pSeedName is used when "add from disk" — pre-fills the name input.
	 */
	function openModuleEditor(pManifest, pGroupName, pExistingName, pSeedName)
	{
		let tmpIsEdit = !!pExistingName;
		let tmpEntry = tmpIsEdit
			? (findModuleInManifest(pManifest, pExistingName) || {}).Entry
			: {
				Name: pSeedName || '',
				Path: '',
				Description: '',
				GitHub: '',
				Documentation: '',
				RelatedModules: [],
			};
		if (!tmpEntry) { return; }

		let tmpTitle = tmpIsEdit ? ('Edit ' + pExistingName) : ('Add module to ' + pGroupName);
		let tmpBackdrop = document.createElement('div');
		tmpBackdrop.className = 'modal-backdrop';
		tmpBackdrop.innerHTML =
			'<div class="modal" style="min-width:640px;max-width:760px">'
			+ '<h3>' + escapeHtml(tmpTitle) + '</h3>'
			+ '<div class="form-row"><label>Name</label>'
			+ '  <input type="text" id="RM-E-Name" value="' + escapeHtml(tmpEntry.Name || '') + '"></div>'
			+ '<div class="form-row"><label>Path</label>'
			+ '  <input type="text" id="RM-E-Path" value="' + escapeHtml(tmpEntry.Path || '') + '" placeholder="modules/&lt;group&gt;/&lt;name&gt;"></div>'
			+ '<div class="form-row"><label>Description</label>'
			+ '  <textarea id="RM-E-Desc" rows="2">' + escapeHtml(tmpEntry.Description || '') + '</textarea></div>'
			+ '<div class="form-row"><label>GitHub</label>'
			+ '  <input type="text" id="RM-E-GitHub" value="' + escapeHtml(tmpEntry.GitHub || '') + '" placeholder="https://github.com/..."></div>'
			+ '<div class="form-row"><label>Documentation</label>'
			+ '  <input type="text" id="RM-E-Docs" value="' + escapeHtml(tmpEntry.Documentation || '') + '" placeholder="https://..."></div>'
			+ '<div class="form-row"><label>Related</label>'
			+ '  <input type="text" id="RM-E-Related" value="' + escapeHtml((tmpEntry.RelatedModules || []).join(', '))
			+ '" placeholder="comma-separated module names"></div>'
			+ '<div class="modal-actions">'
			+ '  <button class="action" data-act="cancel">Cancel</button>'
			+ '  <button class="action primary" data-act="save">' + (tmpIsEdit ? 'Save' : 'Add') + '</button>'
			+ '</div>'
			+ '</div>';
		document.body.appendChild(tmpBackdrop);

		function close() { tmpBackdrop.remove(); }
		tmpBackdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);
		tmpBackdrop.addEventListener('click', function (pEvent)
			{
				if (pEvent.target === tmpBackdrop) { close(); }
			});

		tmpBackdrop.querySelector('[data-act="save"]').addEventListener('click', function ()
			{
				let tmpRelatedStr = tmpBackdrop.querySelector('#RM-E-Related').value.trim();
				let tmpPayload =
					{
						Name:          tmpBackdrop.querySelector('#RM-E-Name').value.trim(),
						Path:          tmpBackdrop.querySelector('#RM-E-Path').value.trim(),
						Description:   tmpBackdrop.querySelector('#RM-E-Desc').value.trim(),
						GitHub:        tmpBackdrop.querySelector('#RM-E-GitHub').value.trim(),
						Documentation: tmpBackdrop.querySelector('#RM-E-Docs').value.trim(),
						RelatedModules: tmpRelatedStr ? tmpRelatedStr.split(',').map(function (pS) { return pS.trim(); }).filter(Boolean) : [],
					};
				if (!tmpPayload.Name)
				{
					alert('Name is required.');
					return;
				}

				let tmpPromise;
				if (tmpIsEdit)
				{
					tmpPromise = apiPatch('/manifest/modules/' + encodeURIComponent(pExistingName), tmpPayload);
				}
				else
				{
					tmpPayload.Group = pGroupName;
					tmpPromise = apiPost('/manifest/modules', tmpPayload);
				}

				tmpPromise.then(
					function ()
						{
							close();
							renderManifestEditor();
							loadModules();
						},
					function (pError)
						{
							alert('Save failed: ' + pError.message);
						});
			});
	}

	function deleteModule(pName)
	{
		if (!window.confirm('Remove "' + pName + '" from the manifest?\n\nThe module directory on disk is NOT touched — only the manifest entry is removed.'))
		{
			return;
		}
		apiDelete('/manifest/modules/' + encodeURIComponent(pName)).then(
			function ()
				{
					renderManifestEditor();
					loadModules();
				},
			function (pError)
				{
					alert('Delete failed: ' + pError.message);
				});
	}

	// ─────────────────────────────────────────────
	//  Boot
	// ─────────────────────────────────────────────

	// Restore filter / scan state from localStorage before first render.
	_filterQuery = lsGet(LS_KEY_FILTER) || '';
	_dirtyOnly   = lsGet(LS_KEY_DIRTYONLY) === '1';
	elSidebarSearch.value = _filterQuery;
	elDirtyOnly.checked = _dirtyOnly;
	try
	{
		let tmpCached = lsGet(LS_KEY_SCAN);
		if (tmpCached) { _scanResults = JSON.parse(tmpCached) || {}; }
	}
	catch (e) { _scanResults = {}; }
	_scanWhen = lsGet(LS_KEY_SCAN_WHEN);
	updateScanMeta();

	elSidebarSearch.addEventListener('input', function (pEvent)
		{
			_filterQuery = pEvent.target.value;
			lsSet(LS_KEY_FILTER, _filterQuery);
			renderSidebar();
		});

	elScanButton.addEventListener('click', runScan);

	elDirtyOnly.addEventListener('change', function ()
		{
			_dirtyOnly = elDirtyOnly.checked;
			lsSet(LS_KEY_DIRTYONLY, _dirtyOnly ? '1' : '0');
			// If user turned on dirty-only but we have no scan yet, kick one.
			if (_dirtyOnly && Object.keys(_scanResults).length === 0)
			{
				runScan();
			}
			renderSidebar();
		});

	elManifestToggle.addEventListener('click', function ()
		{
			if (_mode === 'manifest') { exitManifestMode(); }
			else { enterManifestMode(); }
		});

	elLogToggle.addEventListener('click', function ()
		{
			// Full-screen modal overlay — the workspace stays behind, so the
			// user can close the log and resume where they were.
			if (_logModalOpen)
			{
				// If already open, the modal's own close button / Esc / backdrop
				// click handles dismissal; bail so we don't double-open.
				return;
			}
			openLogModal();
		});

	connectWS();
	pollHealth();
	loadModules();
})();
