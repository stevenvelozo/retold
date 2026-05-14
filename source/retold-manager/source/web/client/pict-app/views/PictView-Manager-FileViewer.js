/**
 * Manager-FileViewer
 *
 * Read-only content viewer that the Files + Search tabs target via
 * `openFile(moduleName, relativePath, line?)`.  Renders into the
 * workspace area so the user keeps their sidebar context.  Two paths:
 *
 *   - markdown files (.md / .markdown / .mdx) — parsed through
 *     pict-section-content's PictContentProvider.parseMarkdown() and
 *     painted via the Pict-Content view (syntax-highlighted fences,
 *     KaTeX math, Mermaid).
 *   - everything else (source, JSON, plain text) — parsed as a
 *     single fenced code block in markdown so the same highlighter
 *     gives us line numbers + token coloring with zero extra work.
 *
 * Image + binary files come back from the server with Content=null;
 * we render a tiny info card linking out instead.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-FileViewer',

	DefaultRenderable:            'Manager-FileViewer-Shell',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.FileViewer',

	AutoRender: false,

	CSS: /*css*/`
		#RM-FileViewer
		{
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
			background: var(--color-bg);
			color: var(--color-text);
		}
		.rm-fileviewer-toolbar
		{
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 6px 12px;
			border-bottom: 1px solid var(--color-border);
			background: var(--color-panel-alt);
			font-size: 12px;
		}
		.rm-fileviewer-path
		{
			flex: 1 1 auto;
			min-width: 0;
			font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
			color: var(--color-text);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.rm-fileviewer-path .module { color: var(--brand-color-primary-mode, var(--color-accent)); font-weight: 600; }
		.rm-fileviewer-path .sep { color: var(--color-muted); margin: 0 4px; }
		.rm-fileviewer-meta
		{
			font-size: 11px;
			color: var(--color-muted);
			font-variant-numeric: tabular-nums;
		}
		.rm-fileviewer-btn
		{
			padding: 2px 10px;
			background: transparent;
			color: var(--color-muted);
			border: 1px solid var(--color-border);
			border-radius: 4px;
			font: inherit;
			font-size: 11px;
			cursor: pointer;
		}
		.rm-fileviewer-btn.is-active
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}
		.rm-fileviewer-btn:hover
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}

		#RM-FileViewer-Body
		{
			flex: 1 1 auto;
			min-height: 0;
			overflow: auto;
			padding: 16px 20px;
		}
		.rm-fileviewer-empty
		{
			color: var(--color-muted);
			font-style: italic;
			text-align: center;
			padding: 40px 16px;
		}
		.rm-fileviewer-binary
		{
			padding: 20px;
			border: 1px dashed var(--color-border);
			border-radius: 6px;
			color: var(--color-muted);
		}
		.rm-fileviewer-binary strong { color: var(--color-text); }
		.rm-fileviewer-image
		{
			max-width: 100%;
			max-height: 80vh;
			border: 1px solid var(--color-border);
			background: var(--color-panel-alt);
		}

		/* Search-result jump-to: highlight the targeted line number + flash
		   a translucent bar across the matching line in the code body.
		   The line-number gutter is the only addressable per-line handle
		   pict-section-content emits (code body is a single text flow),
		   so the flash is an absolutely-positioned overlay on the code
		   wrap. */
		.rm-fileviewer-line-active
		{
			background: var(--brand-color-primary-mode, var(--color-accent));
			color: var(--color-bg, #000);
			padding: 0 4px;
			border-radius: 2px;
			font-weight: 600;
		}
		.pict-content-code-wrap { position: relative; }
		.rm-fileviewer-line-flash
		{
			position: absolute;
			left: 0;
			right: 0;
			background: var(--brand-color-primary-mode, var(--color-accent));
			opacity: 0.18;
			pointer-events: none;
			animation: rm-fileviewer-flash 2.2s ease-out forwards;
			z-index: 1;
		}
		@keyframes rm-fileviewer-flash
		{
			0%   { opacity: 0.40; }
			30%  { opacity: 0.28; }
			100% { opacity: 0.00; }
		}

		/* Word-wrap toggle — flipped via .is-wrap on #RM-FileViewer-Body.
		   pict-section-content's code blocks default to white-space:pre
		   (horizontal scroll on long lines); wrap mode flips them to
		   pre-wrap + breaks long tokens.  Markdown content already
		   wraps; the rule is a no-op there. */
		#RM-FileViewer-Body.is-wrap pre,
		#RM-FileViewer-Body.is-wrap pre code,
		#RM-FileViewer-Body.is-wrap .pict-content-code-wrap pre
		{
			white-space: pre-wrap;
			word-break: break-all;
			overflow-wrap: anywhere;
		}

		/* Fullscreen overlay.
		   The flag class lives on <body> (rm-fileviewer-fullscreen)
		   rather than on #RM-FileViewer itself, so it survives any
		   FileViewer render that rebuilds the root element.  Anything
		   that needs to behave differently in fullscreen mode keys
		   off body.rm-fileviewer-fullscreen as the selector ancestor. */
		body.rm-fileviewer-fullscreen #RM-FileViewer
		{
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
			width: 100vw !important;
			height: 100vh !important;
			max-width: 100vw !important;
			max-height: 100vh !important;
			z-index: 9000;
			border-top: 0 !important;
			background: var(--color-bg);
		}
		/* Belt: when fullscreen, drop pict-section-content's 900px
		   reading-width cap so wide screens actually get more text/code
		   on screen.  Padding scales down so the content doesn't drown
		   in margin on ultrawide displays. */
		body.rm-fileviewer-fullscreen #RM-FileViewer-Content.pict-content,
		body.rm-fileviewer-fullscreen #RM-FileViewer .pict-content
		{
			max-width: none !important;
			padding: 1em 2em !important;
		}
		/* Make sure the toolbar always renders above the content even
		   when the content pane introduces stacking contexts (Mermaid
		   diagrams, code-block fullscreen viewers, etc.). */
		body.rm-fileviewer-fullscreen .rm-fileviewer-toolbar
		{
			position: relative;
			z-index: 1;
			background: var(--color-panel-alt);
		}
	`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-FileViewer-Shell-Template',
			Template: /*html*/`
<div id="RM-FileViewer">
	<div class="rm-fileviewer-toolbar">
		<div class="rm-fileviewer-path">{~TS:Manager-FileViewer-Path-Template:Record.PathSlot~}{~TS:Manager-FileViewer-PathEmpty-Template:Record.PathEmptySlot~}</div>
		<span class="rm-fileviewer-meta">{~D:Record.MetaText~}</span>
		<button type="button" class="rm-fileviewer-btn {~D:Record.WrapBtnClass~}" title="Toggle word wrap for long lines" onclick="_Pict.views['Manager-FileViewer'].toggleWrap()">wrap</button>
		{~TS:Manager-FileViewer-RawBtn-Template:Record.RawBtnSlot~}
		<button type="button" class="rm-fileviewer-btn {~D:Record.FullscreenBtnClass~}" title="Toggle fullscreen (Esc to exit)" onclick="_Pict.views['Manager-FileViewer'].toggleFullscreen()">{~D:Record.FullscreenBtnLabel~}</button>
	</div>
	<div id="RM-FileViewer-Body">{~TS:Manager-FileViewer-Empty-Template:Record.EmptySlot~}{~TS:Manager-FileViewer-Binary-Template:Record.BinarySlot~}{~TS:Manager-FileViewer-Image-Template:Record.ImageSlot~}<div id="RM-FileViewer-Content"></div></div>
</div>
`
		},
		{
			Hash: 'Manager-FileViewer-Path-Template',
			Template: /*html*/`<span class="module">{~D:Record.Module~}</span><span class="sep">/</span>{~D:Record.Path~}`
		},
		{
			Hash: 'Manager-FileViewer-PathEmpty-Template',
			Template: /*html*/`<span class="rm-fileviewer-empty" style="padding:0">(no file open)</span>`
		},
		{
			Hash: 'Manager-FileViewer-RawBtn-Template',
			Template: /*html*/`<button type="button" class="rm-fileviewer-btn {~D:Record.RawBtnClass~}" title="Toggle between rendered and raw view" onclick="_Pict.views['Manager-FileViewer'].toggleRaw()">{~D:Record.RawBtnLabel~}</button>`
		},
		{
			Hash: 'Manager-FileViewer-Empty-Template',
			Template: /*html*/`<div class="rm-fileviewer-empty">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-FileViewer-Binary-Template',
			Template: /*html*/`<div class="rm-fileviewer-binary"><strong>{~D:Record.Name~}</strong> — binary file ({~D:Record.SizeKB~} KB). Not displayed inline.</div>`
		},
		{
			Hash: 'Manager-FileViewer-Image-Template',
			Template: /*html*/`<img class="rm-fileviewer-image" src="{~D:Record.Url~}" alt="{~D:Record.Name~}">`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-FileViewer-Shell',
			TemplateHash:       'Manager-FileViewer-Shell-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace'
		}
	]
};

class ManagerFileViewerView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		// Per-render record lives at AppData.Manager.FileViewer.
		this._current = null;       // { Module, Path, Category, Content, Size, Extension, ... }
		this._raw = false;          // raw (always code-block) mode toggle for markdown
		this._wrap = false;         // word-wrap on long source lines
		this._fullscreen = false;   // overlay viewer at viewport size
		this._jumpToLine = 0;       // pending scroll-into-view after content paints
		this._escListenerBound = false;
	}

	onBeforeRender()
	{
		this._writeRecord();
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		this._paintContent();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	_writeRecord()
	{
		this.pict.AppData.Manager = this.pict.AppData.Manager || {};
		this.pict.AppData.Manager.FileViewer = this._buildRecord();
	}

	_buildRecord()
	{
		let tmpCur = this._current;
		if (!tmpCur)
		{
			return {
				PathSlot:      [],
				PathEmptySlot: [{}],
				MetaText:      '',
				RawBtnSlot:    [],
				EmptySlot:     [{ Message: 'Pick a file from the sidebar — Files tab to browse, Search to find.' }],
				BinarySlot:    [],
				ImageSlot:     []
			};
		}
		let tmpMeta = '';
		if (typeof tmpCur.Size === 'number')
		{
			tmpMeta = (tmpCur.Size >= 1024)
				? (Math.round(tmpCur.Size / 102.4) / 10) + ' KB'
				: tmpCur.Size + ' bytes';
		}
		if (tmpCur.Truncated) { tmpMeta += ' · truncated'; }

		let tmpEmptySlot = [];
		let tmpBinarySlot = [];
		let tmpImageSlot = [];

		if (tmpCur.Loading)
		{
			tmpEmptySlot = [{ Message: 'loading ' + tmpCur.Path + '…' }];
		}
		else if (tmpCur.Error)
		{
			tmpEmptySlot = [{ Message: 'Error: ' + tmpCur.Error }];
		}
		else if (tmpCur.Category === 'image')
		{
			tmpImageSlot = [{
				Url:  '/api/manager/modules/' + encodeURIComponent(tmpCur.Module) + '/file/raw?path=' + encodeURIComponent(tmpCur.Path),
				Name: tmpCur.Path
			}];
		}
		else if (tmpCur.Category === 'binary')
		{
			tmpBinarySlot = [{
				Name:   tmpCur.Path,
				SizeKB: Math.round((tmpCur.Size || 0) / 102.4) / 10
			}];
		}
		// Markdown gets the rendered/raw toggle; everything else just
		// renders as a highlighted code block so there's no toggle.
		let tmpIsMarkdown = (tmpCur.Category === 'markdown');
		let tmpRawBtnSlot = tmpIsMarkdown
			? [{
				RawBtnClass: this._raw ? 'is-active' : '',
				RawBtnLabel: this._raw ? 'rendered' : 'raw'
			}]
			: [];

		// Repo-level files (Module is null) show "repo" as their
		// scope label so the toolbar header is still readable.
		let tmpScopeLabel = tmpCur.IsRepoFile ? 'repo' : tmpCur.Module;

		return {
			PathSlot:           [{ Module: tmpScopeLabel, Path: tmpCur.Path }],
			PathEmptySlot:      [],
			MetaText:           tmpMeta,
			WrapBtnClass:       this._wrap ? 'is-active' : '',
			RawBtnSlot:         tmpRawBtnSlot,
			FullscreenBtnClass: this._fullscreen ? 'is-active' : '',
			FullscreenBtnLabel: this._fullscreen ? 'restore' : 'fullscreen',
			EmptySlot:          tmpEmptySlot,
			BinarySlot:         tmpBinarySlot,
			ImageSlot:          tmpImageSlot
		};
	}

	// Paint into #RM-FileViewer-Content via pict-section-content's
	// view + provider.  Called from onAfterRender; the container is
	// guaranteed to exist by the time we get here.
	_paintContent()
	{
		let tmpCur = this._current;
		let tmpContent = document.getElementById('RM-FileViewer-Content');
		if (!tmpContent) { return; }
		// Re-apply the wrap class on every paint — pict-view's render
		// replaces the toolbar + body, dropping any classes we toggled
		// on the body element.
		let tmpBody = document.getElementById('RM-FileViewer-Body');
		if (tmpBody)
		{
			if (this._wrap) { tmpBody.classList.add('is-wrap'); }
			else            { tmpBody.classList.remove('is-wrap'); }
		}
		// Fullscreen class lives on <body> now (see _applyFullscreenClass)
		// so it survives every render — no per-render reapply needed.
		// Clear stale paint between renders.
		tmpContent.innerHTML = '';
		if (!tmpCur || tmpCur.Loading || tmpCur.Error || tmpCur.Content == null) { return; }
		if (tmpCur.Category === 'image' || tmpCur.Category === 'binary') { return; }

		let tmpProvider = this.pict.providers['Pict-Content'];
		let tmpView     = this.pict.views['Pict-Content'];
		if (!tmpProvider || !tmpView)
		{
			tmpContent.innerText = tmpCur.Content;
			return;
		}

		let tmpMarkdown;
		if (tmpCur.Category === 'markdown' && !this._raw)
		{
			tmpMarkdown = tmpCur.Content;
		}
		else
		{
			// Wrap the file in a fenced code block so the content
			// view's highlighter handles syntax + line numbers for us
			// regardless of the underlying type.
			let tmpLang = this._languageHint(tmpCur.Extension);
			tmpMarkdown = '```' + tmpLang + '\n' + tmpCur.Content + '\n```';
		}

		let tmpHTML = tmpProvider.parseMarkdown(tmpMarkdown);
		tmpView.displayContent(tmpHTML, 'RM-FileViewer-Content');

		// Jump-to-line: scroll the matching line number into view
		// after the highlighter finishes.  Best-effort — exact DOM
		// shape depends on the highlighter; we look for .line[data-line]
		// or .line-number elements as fallbacks.
		if (this._jumpToLine > 0)
		{
			let tmpLine = this._jumpToLine;
			this._jumpToLine = 0;
			setTimeout(() => this._scrollToLine(tmpLine), 50);
		}
	}

	_scrollToLine(pLine)
	{
		if (!pLine || pLine < 1) { return; }
		let tmpRoot = document.getElementById('RM-FileViewer-Content');
		if (!tmpRoot) { return; }

		// pict-section-content renders code blocks as:
		//   <div class="pict-content-code-wrap">
		//     <div class="pict-content-code-line-numbers">
		//       <span>1</span><span>2</span>...
		//     </div>
		//     <pre><code>...all-the-source...</code></pre>
		//   </div>
		// The code body is a single text-flow (no per-line elements),
		// so the line-number span is the only addressable per-line
		// handle.  Scroll to it, then ALSO compute the matching line's
		// vertical offset inside the <code> block and add a transient
		// highlight overlay so the user can spot it past a multi-hit
		// flurry.
		let tmpGutter = tmpRoot.querySelector('.pict-content-code-line-numbers');
		if (!tmpGutter) { return; }
		let tmpSpans = tmpGutter.children;
		if (pLine > tmpSpans.length) { pLine = tmpSpans.length; }
		let tmpSpan = tmpSpans[pLine - 1];
		if (!tmpSpan) { return; }

		// Remove any previous highlight so jumping between hits doesn't
		// leave a trail of marked lines.
		let tmpPrev = tmpRoot.querySelectorAll('.rm-fileviewer-line-active');
		for (let i = 0; i < tmpPrev.length; i++) { tmpPrev[i].classList.remove('rm-fileviewer-line-active'); }
		let tmpPrevHL = tmpRoot.querySelector('.rm-fileviewer-line-flash');
		if (tmpPrevHL) { tmpPrevHL.remove(); }

		tmpSpan.classList.add('rm-fileviewer-line-active');
		tmpSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Drop a flash bar across the code body at the same vertical
		// position as the targeted line-number span.  Same parent so
		// the bar scrolls with the content.
		let tmpWrap = tmpSpan.closest('.pict-content-code-wrap');
		if (tmpWrap)
		{
			let tmpFlash = document.createElement('div');
			tmpFlash.className = 'rm-fileviewer-line-flash';
			// Position relative to the wrap; vertical offset = the
			// span's offsetTop within the gutter (line numbers use the
			// same line-height as the code).
			tmpFlash.style.top = (tmpSpan.offsetTop) + 'px';
			tmpFlash.style.height = (tmpSpan.offsetHeight) + 'px';
			tmpWrap.appendChild(tmpFlash);
			setTimeout(() =>
				{
					if (tmpFlash && tmpFlash.parentNode) { tmpFlash.parentNode.removeChild(tmpFlash); }
				}, 2200);
		}
	}

	_languageHint(pExt)
	{
		let tmpExt = (pExt || '').toLowerCase().replace(/^\./, '');
		let tmpMap = {
			js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
			ts: 'typescript', tsx: 'typescript',
			json: 'json', yml: 'yaml', yaml: 'yaml',
			md: 'markdown', markdown: 'markdown',
			py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
			sh: 'bash', bash: 'bash', zsh: 'bash',
			html: 'html', htm: 'html', xml: 'xml',
			css: 'css', scss: 'scss', sass: 'sass', less: 'less',
			sql: 'sql', java: 'java', kt: 'kotlin', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
			swift: 'swift', toml: 'toml', ini: 'ini', conf: 'ini',
			dockerfile: 'dockerfile', makefile: 'makefile'
		};
		return tmpMap[tmpExt] || '';
	}

	// ─────────────────────────────────────────────
	//  Public API — called from the sidebar
	// ─────────────────────────────────────────────

	openFile(pModuleName, pPath, pLine)
	{
		if (!pModuleName || !pPath) { return; }
		this._openImpl({ Module: pModuleName, Path: pPath, Line: pLine });
	}

	// Repo-relative read for files that fall outside any manifested
	// module (top-level package.json, Retold-Modules-Manifest.json,
	// monorepo helper scripts, root-level test/, etc.).  Mounts the
	// same content viewer with Module displayed as 'repo' so the
	// toolbar is still readable.
	openRepoFile(pPath, pLine)
	{
		if (!pPath) { return; }
		this._openImpl({ Module: null, Path: pPath, Line: pLine });
	}

	_openImpl(pParams)
	{
		let tmpModuleName = pParams.Module;       // null for repo-relative reads
		let tmpPath       = pParams.Path;
		let tmpLine       = pParams.Line || 0;
		let tmpIsRepo     = !tmpModuleName;

		this._current = {
			Module:      tmpModuleName,
			Path:        tmpPath,
			IsRepoFile:  tmpIsRepo,
			Loading:     true,
			Error:       null,
			Content:     null,
			Category:    null,
			Size:        null,
			Extension:   null,
			Truncated:   false
		};
		this._raw = false;
		this._jumpToLine = tmpLine;

		// Defer the "loading…" render so a fast fetch lands a single
		// final render — pict-view's render isn't safe to call twice
		// inside the same microtask (the second one's DOM update can
		// be dropped, leaving stale toolbar fields).
		let tmpLoadingShownTimer = setTimeout(() =>
			{
				if (this._current && this._current.Path === tmpPath && this._current.Loading)
				{
					this.render();
				}
			}, 100);

		let tmpAPI = this.pict.providers.ManagerAPI;
		if (!tmpAPI || typeof tmpAPI.get !== 'function')
		{
			clearTimeout(tmpLoadingShownTimer);
			this._current.Loading = false;
			this._current.Error   = 'ManagerAPI provider missing';
			this.render();
			return;
		}

		let tmpURL = tmpIsRepo
			? '/repo/file?path=' + encodeURIComponent(tmpPath)
			: '/modules/' + encodeURIComponent(tmpModuleName) + '/file?path=' + encodeURIComponent(tmpPath);

		tmpAPI.get(tmpURL).then(
			(pBody) =>
			{
				clearTimeout(tmpLoadingShownTimer);
				if (!this._current || this._current.Module !== tmpModuleName || this._current.Path !== tmpPath) { return; }
				this._current = {
					Module:     tmpModuleName,
					Path:       tmpPath,
					IsRepoFile: tmpIsRepo,
					Loading:    false,
					Error:      null,
					Content:    pBody.Content,
					Category:   pBody.Category,
					Size:       pBody.Size,
					Extension:  pBody.Extension,
					Truncated:  !!pBody.Truncated
				};
				this.render();
				// Belt-and-braces second render outside the promise
				// microtask: pict-view's slot expansion intermittently
				// drops substitutions when fired inside fetch.then().
				setTimeout(() => this.render(), 0);
			},
			(pError) =>
			{
				clearTimeout(tmpLoadingShownTimer);
				if (!this._current || this._current.Module !== tmpModuleName || this._current.Path !== tmpPath) { return; }
				this._current.Loading = false;
				this._current.Error   = pError && pError.message ? pError.message : 'failed';
				this.render();
				setTimeout(() => this.render(), 0);
			});
	}

	toggleRaw()
	{
		this._raw = !this._raw;
		this.render();
	}

	toggleFullscreen()
	{
		this._fullscreen = !this._fullscreen;
		this._applyFullscreenClass();
		// Bind the Esc handler the first time fullscreen is enabled
		// in this session.  Browser-level event, no inline equivalent.
		if (!this._escListenerBound)
		{
			this._escListenerBound = true;
			document.addEventListener('keydown', (pEvent) =>
				{
					if (pEvent.key === 'Escape' && this._fullscreen)
					{
						this.toggleFullscreen();
					}
				});
		}
		// Re-render so the toolbar's button label (fullscreen ↔ restore)
		// and active-state class update.  Two renders: pict-view's
		// template-slot expansion intermittently drops substitutions
		// when fired from a synchronous user handler; a follow-up tick
		// reliably picks them up.
		this.render();
		setTimeout(() => this.render(), 0);
	}

	_applyFullscreenClass()
	{
		// Toggle on the BODY so the class survives any FileViewer
		// render (which replaces #RM-FileViewer wholesale).  Keeps a
		// matching class on the root for any host code that still keys
		// off it.
		let tmpBody = document.body;
		if (!tmpBody) { return; }
		if (this._fullscreen) { tmpBody.classList.add('rm-fileviewer-fullscreen'); }
		else                  { tmpBody.classList.remove('rm-fileviewer-fullscreen'); }
	}

	toggleWrap()
	{
		this._wrap = !this._wrap;
		// Live-flip the class on the body without forcing a full
		// re-render (which would replay the paint + lose any
		// flash-highlight in flight).  Toolbar's active-state class
		// gets refreshed on the next render naturally.
		let tmpBody = document.getElementById('RM-FileViewer-Body');
		if (tmpBody)
		{
			if (this._wrap) { tmpBody.classList.add('is-wrap'); }
			else            { tmpBody.classList.remove('is-wrap'); }
		}
		// Refresh toolbar so the wrap button reflects active state.
		// We're not re-running _paintContent — just the shell.
		this._writeRecord();
		let tmpBtn = document.querySelector('.rm-fileviewer-toolbar .rm-fileviewer-btn[title*="word wrap"]');
		if (tmpBtn)
		{
			if (this._wrap) { tmpBtn.classList.add('is-active'); }
			else            { tmpBtn.classList.remove('is-active'); }
		}
	}
}

module.exports = ManagerFileViewerView;
module.exports.default_configuration = _ViewConfiguration;
