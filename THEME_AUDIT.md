# Pict Theme Audit (Phase 0)

## Executive Summary

The Retold ecosystem currently employs **CSS custom properties** (CSS variables) for theming, with hardcoded token values in CSS files and no centralized JS-side token tree. Apps like Ultravisor and Retold Facto have multi-theme support (light/dark variants) using `data-theme` attributes and `:root` / `body[data-theme="..."]` selectors. SVG usage is minimal and scattered. There is **NO unified token catalog** and **NO existing theme manifest**—each module and app manages its own CSS independently. The new `pict-provider-theme` module must introduce standardization.

---

## 1. Token Inventory

### Colors

**Catalog of distinct color values across the ecosystem:**

#### Backgrounds (Semantic)
- **Base/Primary:** `#1a1714`, `#faf6f0`, `#f5f6f8`, `#f6f0e4`, `#12151e`
- **Surface/Secondary:** `#252018`, `#f0e6d6`, `#fff`, `#fcf8f0`, `#1a1e2e`
- **Elevated/Tertiary:** `#302818`, `#e8ddd0`, `#e4e7ec`, `#ede5d5`, `#242940`
- **Input:** `#1a1714`, `#fff`, `#f5f6f8`, `#fcf8f0`, `#1e2235`
- **Code:** `#151210`, `#f0e6d6`, `#f0f1f4`, `#f0e8d8`, `#161a28`
- **Overlay:** `rgba(0, 0, 0, 0.5)` (modal)

**Ultravisor-specific (3 themes: desert-dusk, desert-day, desert-sunset, professional-light):**
- `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor-themes.css:1-240` — ~115 unique colors across light/dark variants
- Colors cluster around warm earth tones (desert palette) and cool blues (professional)

**Retold-Remote (3 themes: cyberpunk, daylight, neo-tokyo):**
- `/Users/steven/Code/retold/modules/apps/retold-remote/css/retold-remote.css:17-60` — uses `--retold-bg-primary`, `--retold-bg-secondary`, etc. (theme vars not yet defined in base CSS)

**Retold Facto (2 themes: turquoise-deluxe, facto-dark):**
- `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css:1-150` — turquoise (#18a5a0) primary, dark variant (#4a90d9 blue)
- **Brand color opacity variants:** `--facto-brand-a05` through `--facto-brand-a25` (5%, 8%, 10%, 12%, 15%, 20%, 25%)

**Retold Content System:**
- `/Users/steven/Code/retold/modules/apps/retold-content-system/css/content-system.css:19-42` — hardcoded `#FAF8F4` (bg), `#423D37` (text), `#C4BDB0` (scrollbar)

#### Foregrounds (Text)
- **Primary:** `#1a1a1a`, `#c8b8a0`, `#2d3748`, `#3a3020`, `#c8cdd8`
- **Secondary:** `#907860`, `#6b7280`, `#786848`, `#8890a8`
- **Tertiary:** `#706050`, `#9ca3af`, `#a09070`, `#5c6480`
- **Muted/Placeholder:** `#8A7F72`, `#95a5a6`

#### Brand & Accent
- **Ultravisor (desert-dusk):** `#c4956a` (tan/warm)
- **Ultravisor (professional-light):** `#3b82f6` (blue)
- **Retold Facto:** `#18a5a0` (teal) / `#4a90d9` (dark blue)
- **Retold Remote:** `--retold-accent` (variable, likely teal)
- **Pict Modal:** `#2563eb` (bright blue)

#### Semantic Status
- **Success:** `#8a9a5a` (desert-dusk), `#5a7a30` (day), `#6a9a3a` (sunset), `#16a34a` (modal), `#3a9468` (facto)
- **Error/Danger:** `#b04050` (dusk), `#a03040` (day), `#c44e2a` (sunset), `#dc2626` (modal), `#c44836` (facto)
- **Warning:** `#c0a050` (dusk), `#b08020` (day), `#d4a46a` (sunset), `#d97706` (modal), `#d09818` (facto)
- **Info:** `#4a9090` (all themes), `#2563eb` (modal), `#18a5a0` (facto)

#### Borders
- **Primary:** `#3a3028` (dusk), `#e0d0b8` (day), `#3a2e22` (sunset), `#DDD6CA`, `#e2e5ea` (prof), `#d6c8ae` (facto)
- **Subtle:** `#302818` (dusk), `#e8ddd0` (day), `#342818` (sunset), `#eceef2` (prof), `#e8ddc8` (facto)
- **Focus:** `#c4956a` (dusk), `#c2703e` (day), `#e8943a` (sunset), `#3b82f6` (prof), `#18a5a0` (facto)

#### Shadows
- **Light:** `rgba(0, 0, 0, 0.1)`, `rgba(58, 48, 40, 0.3)`, `rgba(92, 61, 46, 0.1)`
- **Heavy:** `rgba(0, 0, 0, 0.5)`, `rgba(92, 61, 46, 0.2)`, `rgba(0, 0, 0, 0.12)`

#### Scrollbar
- **Track:** `#252018`, `#f0e6d6`, `#f5f0e8`, `#f6f0e4`
- **Thumb:** `#3a3028`, `#d0c0a8`, `#d6c8ae`
- **Hover:** `#4a4038`, `#c0b098`, `#c0b090`

### Typography

**Font Families:**
- **System stack (universal):** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace (code/editor):** `'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'Courier New', monospace`

**Sizes (across modules):**
- **Body:** `14px` (most common), `16px` (base for scaling)
- **Headings:** `16px` (h6/subtitle), `24px` (h1)
- **Small:** `12px`, `13px` (secondary text, tooltips)
- **Code/Mono:** `14px`

**Weights:**
- **Normal:** 400
- **Semi-bold:** 500, 600 (headings, form labels)
- **Bold:** 700

**Line Heights:**
- **Body:** `1.5`, `1.6`, `1.7`
- **Headings:** `1.3`
- **Tables/Dense:** `1`
- **Code:** `1.5`

**Source files:**
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:117-119` (modal defaults)
- `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor.css:13-14` (ultravisor base)
- `/Users/steven/Code/retold/modules/pict/pict-section-content/source/views/Pict-View-Content.js:13-18` (content view)
- `/Users/steven/Code/retold/modules/pict/pict-section-code/source/Pict-Section-Code-DefaultConfiguration.js:58-63` (code editor)

### Spacing

**Padding/Margin scales (in `px` and `em`):**
- **Micro:** `2px`, `4px`, `0.15em`, `0.25em`
- **Small:** `6px`, `8px`, `10px`, `0.5em`
- **Medium:** `12px`, `16px`, `1em`, `1.25em`
- **Large:** `24px`, `2em`, `3em`

**Example uses:**
- Modal padding: `12px 16px` (header/footer), `16px` (body)
- Panel padding: `10px 10px 10px 8px` (code editor)
- Content padding: `2em 3em` (article container)
- Table cells: `0.6em 0.75em` (th), `0.5em 0.8em` (td)

### Radii

**Border Radius:**
- **Sharp:** `0px` (table cells, grid)
- **Subtle:** `3px`, `4px` (inputs, buttons, code blocks)
- **Medium:** `6px` (panels, cards)
- **Large:** `8px` (modals, containers)

**Source:**
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:82, 98, 107` — modal defaults 4px-8px
- `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:54` — `--pf-node-body-radius: 8px`

### Shadows

**Drop Shadows:**
- **Light:** `drop-shadow(0 1px 3px rgba(0, 0, 0, 0.10))`
- **Medium:** `drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))`, `0 4px 24px rgba(0, 0, 0, 0.15)`
- **Heavy:** `drop-shadow(0 4px 12px rgba(0, 0, 0, 0.20))`, `0 4px 16px rgba(0, 0, 0, 0.12)`
- **Box Shadows:** `0 2px 12px rgba(0, 0, 0, 0.15)` (toast), `0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)` (panels)

**Sources:**
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:83, 108, 114`
- `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:55-58`

### Z-Index Conventions

**Modal stack:**
- `z-index: 1000` — Overlay
- `z-index: 1010` — Dialog (on top of overlay)
- `z-index: 1020` — Tooltip
- `z-index: 1030` — Toast container
- `z-index: 50-51` — Panel edge/tab (relative positioning within layout)

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:75-133`

### Animation / Transition Durations

- **Standard transition:** `200ms` (modals, opacity, transforms)
- **Button/hover:** `150ms`, `0.15s` (background, border-color)
- **Panel resize:** `0.2s`, `0.25s`
- **Easing:** `ease` (most common), `ease-out` (less frequent)

**Sources:**
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:122, 136, 154, 376`
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:504, 540` (panel durations)

---

## 2. Component Visual Patterns

### Button
- **Primary (action):** Branded color background, white text, hover darkening
  - Modal: `--pict-modal-btn-primary-bg: #2563eb` → hover `#1d4ed8`
  - Facto: `--facto-btn-primary-bg: #18a5a0`
  - Ultravisor: `--uv-btn-primary-bg: #4a9090` (dusk), `#3b82f6` (professional)
- **Danger (destructive):** Red background, lighter text
  - Modal: `--pict-modal-btn-danger-bg: #dc2626` → hover `#b91c1c`
  - Facto: Not explicitly colored, uses primary styling
  - Ultravisor: `--uv-btn-danger-bg: #6a3040` (dusk)
- **Secondary (neutral):** Light background, text color
  - Modal: `--pict-modal-btn-bg: #e0e0e0` → hover `#d0d0d0`
  - Facto: `--facto-btn-secondary-bg: #ede5d5`
  - Ultravisor: Secondary buttons not theme-defined, likely fallback to border style
- **Padding:** `8px 16px`
- **Border-radius:** `4px` (modal), `8px` (facto)
- **Disabled state:** `opacity: 0.5`, `cursor: not-allowed`

**Source files:**
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:237-281` (modal buttons)
- `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css:37-40`

### Input (text, select, textarea)
- **Background:** Lighter than page bg, white in light modes
  - Modal: `--pict-modal-bg` (white in light, dark in dark)
  - Ultravisor: `#e0e0e0` in dark mode, white in light mode (hardcoded in `.pict-flow-panel`)
  - Facto: `--facto-bg-input` (varies by theme)
- **Border:** Subtle, gray—default inactive
  - Modal: `--pict-modal-border: #e0e0e0`
  - Focus: Branded color or accent
  - Modal focus: `--pict-modal-btn-primary-bg` (blue)
- **Padding:** `0.5em 0.75em` (8px 12px at default 16px font)
- **Font:** inherit from parent
- **Border-radius:** `4px`
- **Transition:** border-color `150ms`

**Source:**
- `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor.css:38-54` (inputs)
- `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:284-300` (confirm input)

### Modal / Dialog
- **Overlay:** `rgba(0, 0, 0, 0.5)` (consistent across apps)
- **Background:** White in light, `#ffffff` / `#f5f5f5` in light, dark theme adjusts
- **Border:** `1px solid --pict-modal-border`
- **Border-radius:** `8px`
- **Shadow:** Heavy, `0 4px 24px rgba(0, 0, 0, 0.15)`
- **Width:** `480px` (default modal)
- **Header:** Light background (`#f5f5f5`), border-bottom
- **Footer:** Light background, border-top, flex layout with gap `8px`
- **Z-index:** 1000 (overlay), 1010 (dialog)
- **Animation:** `opacity 200ms ease, transform 200ms ease` (fade-in + slide up)

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:145-168`

### Toast
- **Background:** Dark default (`#333333`), semantic colors for success/error/warning/info
  - Success: `#16a34a`
  - Error: `#dc2626`
  - Warning: `#d97706`
  - Info: `#2563eb`
- **Text:** White
- **Border-radius:** `6px`
- **Shadow:** `0 2px 12px rgba(0, 0, 0, 0.15)`
- **Padding:** `12px 16px`
- **Position:** `top-right`, `top-left`, `bottom-right`, `bottom-left`, `top-center`, `bottom-center`
- **Animation:** Slide in from right, fade out on dismiss
- **Pointer events:** Container is `pointer-events: none`; individual toasts are `auto`

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:310-410`

### Table
- **Header background:** `--uv-table-header-bg`, `--facto-table-header-bg` (light gray in light mode, dark in dark)
- **Header text:** Uppercase, `0.8em`, letter-spacing `0.05em`
- **Borders:** `1px solid var(--*-border)`, column dividers
- **Row hover:** `background: var(--*-table-row-hover)` (subtle highlight)
- **Striping (optional):** `rgba(58, 48, 40, 0.3)` alternating
- **Padding:** `0.6em 0.75em` (header), `0.5em 0.8em` (body)

**Sources:**
- `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor.css:73-92`
- `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css:52-54`

### Card / Panel
- **Background:** `--*-bg-elevated` or `--*-bg-surface`
- **Border:** `1px solid var(--*-border)`
- **Border-radius:** `8px`
- **Shadow:** Light, `0 4px 12px rgba(0,0,0,0.10)`
- **Padding:** Varies, typically `1em` to `2em`

**Sources:**
- `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:104-150` (flow panels)

### Code Editor
- **Background:** `#FAFAFA` (light), `#3D3229` (dark/content), `#1a1714` (ultravisor dusk)
- **Text color:** `#383A42` (light), `#E8E0D4` (dark/content)
- **Border:** `1px solid #D0D0D0`
- **Font:** Monospace, `14px`, line-height `1.5`
- **Line numbers panel:** Separate column, `40px` wide, muted color
- **Syntax highlighting:** Keyword, string, number, comment, operator, function-name, property colors (detailed in each module)

**Sources:**
- `/Users/steven/Code/retold/modules/pict/pict-section-code/source/Pict-Section-Code-DefaultConfiguration.js:58-120`
- `/Users/steven/Code/retold/modules/pict/pict-section-content/source/views/Pict-View-Content.js:61-136`

### Tabs
- **Inactive text:** `--pf-tab-text` (#8e99a4 in flow), muted gray
- **Active border:** `--pf-tab-active-border` (branded color, e.g., `#3498db`)
- **Inactive color:** `--*-text-muted`
- **Hover:** Slightly lighter text

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:113-116`

### Flow Nodes (SVG-based)
- **Body fill:** `#ffffff`, stroke `#d0d4d8`
- **Hover:** Stroke lightens to `#b0b8c0`
- **Selected:** Stroke becomes `#3498db` (blue)
- **Title bar:** `#2c3e50` (dark blue-gray)
- **Variants:** Start (#eafaf1 / #27ae60), end (#e8f8f5 / #1abc9c), halt (#fdedec / #e74c3c), decision (#fff9e6 / #f39c12)
- **Ports (circles):** Input `#3498db`, output `#2ecc71`, setting `#e67e22`, value `#f1c40f`, error `#e74c3c`

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:36-97`

### Typography (Headings, Body, Links)
- **H1:** `2em`, `#3D3229` (dark brown), border-bottom, padding-bottom
- **H2:** `1.5em`, border-bottom, smaller spacing
- **Links:** `#2E7D74` (teal) / app-specific accent, hover underline
- **Body text:** `#423D37` (text-primary), `1.5-1.7` line-height
- **Secondary text:** `#8A7F72`, smaller font, muted

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-content/source/views/Pict-View-Content.js:26-60`

### Blockquote
- **Border-left:** `4px solid #2E7D74`
- **Background:** Light, `#F7F5F0`
- **Text color:** `#5E5549`
- **Padding:** `0.5em 1em`

**Source:** `/Users/steven/Code/retold/modules/pict/pict-section-content/source/views/Pict-View-Content.js:143-151`

---

## 3. SVG / Image / Asset Usage

### SVG Assets Found

**In Pict modules:**
- `/Users/steven/Code/retold/modules/pict/pict-panel/assets/logo/PICT-Inkscape.svg` — Logo asset (Inkscape source)
- `/Users/steven/Code/retold/modules/pict/pict-panel/assets/logo/PICT-Web-Plain.svg` — Logo asset (web-safe variant)
- `/Users/steven/Code/retold/modules/pict/pict-docuserve/example_applications/todo-app/docs/images/task-icon.svg` — Example task icon

**In apps:**
- `/Users/steven/Code/retold/modules/apps/ultravisor/dist/ultravisor_staging/...` — User-uploaded content (not design assets)
- Retold-Facto: Flow diagram uses inline SVG (programmatically rendered, not asset-based)
- Retold-Remote: No dedicated SVG assets in source; likely uses data URIs or dynamic SVG generation

### Icon Systems

**No icon font or sprite sheet found.** Observations:
- **Pict-Section-Modal:** No icons used; text-based buttons with Unicode (×) for close
- **Pict-Section-Flow:** Node type glyphs inlined or class-based styling, ports as SVG circles
- **Retold-Content:** Emphasis on typography; no icons in core markdown rendering

### Illustrations & Backgrounds

- **Ultravisor:** Desert-themed palette suggests potential for illustrated backgrounds, but none found in source
- **Retold-Facto:** Flow diagram is the primary illustration (SVG, real-time)
- **General:** No background images or patterns discovered in CSS

### Logo Usage

- **Pict:** Two logo assets in `/pict-panel/assets/logo/`
- **Apps:** Logos likely in web app indexes (HTML files) or served separately; not found in CSS search

### Image Handling in CSS

- **All apps:** Use `var(--*-bg-*)` and `var(--*-scrollbar-*)` for theming; no `background-image` URLs in scanned CSS
- **Retold-Content:** `img { max-width: 100%; height: auto; }` — responsive image handling for markdown content

---

## 4. Existing Token / Variable Patterns

### CSS Custom Properties (CSS Variables) — Widely Used

**Prefix conventions:**
- `--pict-modal-*` (pict-section-modal)
- `--pf-*` (pict-section-flow)
- `--retold-*` (retold-remote, retold-content-system)
- `--facto-*` (retold-facto)
- `--uv-*` (ultravisor)

**Examples of well-structured variable sets:**

1. **Pict Modal** (`/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:71-123`)
   - ~50 variables defined on `.pict-modal-root` class (scoped to root)
   - Categories: overlay, dialog, buttons, toast, tooltip, typography, animation
   - Clear semantic naming: `--pict-modal-btn-primary-bg`, `--pict-modal-toast-success-bg`

2. **Pict Flow** (`/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:36-160`)
   - ~80+ variables on `.pict-flow-container`
   - Categories: text, node, port, connection, panel, tabs, buttons, badges, canvas, grid
   - **Very comprehensive:** separate variables for hover, selected, dragging states
   - **Opacity variants:** `--pf-port-item-bg`, `--pf-card-hover-bg` with separate shadow vars

3. **Ultravisor** (`/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor-themes.css:8-240`)
   - Root `:root { }` block (115+ variables)
   - Body-scoped theme selectors: `body[data-theme="desert-day"]`, `body[data-theme="professional-light"]`, etc.
   - **Opacity transparency not used**; full hex colors for all variants
   - No alpha transparency variables

4. **Retold Facto** (`/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css:8-62`)
   - Root `:root { }` block with 40+ base variables
   - **Unique feature:** `--facto-brand-a05` through `--facto-brand-a25` (alpha transparency tiers)
   - Body-scoped dark variant: `body[data-theme="facto-dark"]`
   - **Integrates flow overrides:** `body .pict-flow-container { }` scope-maps (`--pf-canvas-bg: var(--facto-bg-surface)`)

5. **Retold Remote** (`/Users/steven/Code/retold/modules/apps/retold-remote/css/retold-remote.css:17-288`)
   - **Variables referenced but NOT defined in base CSS** — theme vars live in config/JS
   - Uses `--retold-bg-primary`, `--retold-text-primary`, `--retold-accent`, etc.
   - Suggests runtime theme injection via `<style>` or `element.style`

### JS-Side Token Trees

**None found.** Observations:
- Theme switching is **DOM-based** (add/remove `data-theme` attribute on `<body>`)
- No JavaScript object representing colors/spacing (no `const TOKENS = { colors: {...} }`)
- Pict-Section-Form uses `CSSClass` property on sections/groups but no token abstraction

**Source:**
- `/Users/steven/Code/retold/modules/pict/pict-section-form/source/services/ManifestFactory.js` — `tmpSection.CSSClass`, `tmpGroup.CSSClass`

### Partial Theme Infrastructure

1. **Ultravisor:**
   - Runtime theme switcher likely in web app (not in source tree scanned)
   - `data-theme` attribute toggles CSS variable scope
   - Multiple theme files (or single file with scoped selectors)

2. **Retold Facto:**
   - Same `data-theme` approach
   - Flow-specific overrides baked into CSS (not dynamic)

3. **Retold Remote:**
   - Variables referenced but not yet set (incomplete theme implementation)
   - Suggests theme vars are **injected at runtime** (likely in app init)

---

## 5. Dark Mode / Color Scheme Handling

### Strategies in Use

1. **`data-theme` attribute + CSS selectors (Ultravisor, Facto, Remote)**
   - Applied to `<body>`
   - Themes toggled by JS: `document.body.setAttribute('data-theme', 'desert-day')`
   - Each theme is a complete CSS rule set (not differential)

2. **`@media (prefers-color-scheme: dark)` (Pict modules)**
   - `/Users/steven/Code/retold/modules/pict/pict-view/docs/themes.md:96-114` — documented pattern
   - Not yet adopted in modal or flow (modal is light/dark but uses default `:root` + `body[data-theme]`)
   - Could coexist with `data-theme` for system preference fallback

3. **Hardcoded single theme (Pict Content, Code)**
   - Light-only: brown/tan color scheme
   - No dark mode support
   - Would require re-theming to support

### Multi-Theme Apps

**Ultravisor (4 themes):**
1. Desert Dusk (default, dark warm)
2. Desert Day (light warm)
3. Desert Sunset (dark warm, orange-focused)
4. Professional Light (light blue)

**Retold Facto (2 themes):**
1. Turquoise Deluxe (default, light)
2. Facto Dark (dark)

**Retold Remote (3 themes per debug assets):**
1. Daylight (likely light)
2. Cyberpunk (likely dark/neon)
3. Neo-Tokyo (likely dark/neon)
(Theme vars not yet set in source; implementation incomplete)

### Observations

- **No system preference fallback** — apps don't check `prefers-color-scheme` to auto-select light/dark
- **Per-token bifurcation:** Ultravisor duplicates all token values for each theme (non-delta approach)
- **No dark/light mode variants within a theme** — each theme is monolithic
- **No animation on theme switch** — CSS variables update, DOM repaints immediately

---

## 6. Per-App Theme Profile

### Ultravisor
- **File:** `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor-themes.css`
- **LOC:** 668
- **CSS Base:** `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor.css` (144 LOC)
- **Total CSS:** ~812 LOC
- **Color palette:** Desert earth tones (warm browns, tans, muted teals)
- **Vibe:** Warm, sophisticated, tech-forward (data-driven aesthetic)
- **Themes:** 4 (warm/cool, light/dark mix)
- **Unique features:**
  - Topbar with custom colors (`--uv-topbar-bg`, `--uv-topbar-text`)
  - Table styling with striping
  - Heavy customization of pict-flow-panel for light inputs in dark mode

### Retold-Remote
- **File:** `/Users/steven/Code/retold/modules/apps/retold-remote/css/retold-remote.css`
- **LOC:** 4714 (largest CSS footprint)
- **Theme structure:** Base CSS references theme vars, but theme definitions not found in source (likely JS-injected)
- **Color palette:** Planned (variables exist but values not set)
- **Vibe:** Modern, clean, viewer-focused (desktop/streaming app)
- **Unique features:**
  - Fullscreen viewer with header fade-on-hover
  - Layout-heavy (sidebar, tabs, editor panes)
  - Responsive scrollbar and focus outlines
  - Rich component library (sidebar-tabs, panels, buttons)

### Retold-Facto
- **File:** `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css` (467 LOC) + `facto.css` (502 LOC)
- **Total CSS:** ~969 LOC
- **Color palette:** Teal/turquoise primary (light theme), blue primary (dark theme)
- **Vibe:** Modern, technical, node-based (workflow/DAG editor)
- **Themes:** 2 (light default, dark)
- **Unique features:**
  - Opacity brand variants (`.a05` to `.a25`) for layering
  - Heavy integration with pict-section-flow (canvas, nodes, connections)
  - Table styling with stripe pattern
  - Topbar with dark background

### Retold Content System
- **File:** `/Users/steven/Code/retold/modules/apps/retold-content-system/css/content-system.css`
- **LOC:** 42 (minimal)
- **Color palette:** Warm, light (tan/cream backgrounds, brown text)
- **Vibe:** Minimal, document-focused, markdown-first
- **Themes:** 1 (light only)
- **Unique features:**
  - Hardcoded colors (no CSS variables)
  - Heavy GitHub Flavored Markdown styling (github.css imported)
  - Scrollbar styling only

---

## 7. Recommendations for Manifest Schema

### Minimum Token Categories for Manifest

The manifest **must** support:

1. **Colors** (semantic, not absolute)
   - **Backgrounds:** base, surface, elevated, input, code, overlay
   - **Text:** primary, secondary, tertiary, muted/placeholder
   - **Brand:** primary, hover (+ opacity variants if needed)
   - **Semantic:** success, error, warning, info
   - **Borders:** primary, subtle, focus
   - **Shadows:** light, medium, heavy
   - **Scrollbar:** track, thumb, thumb-hover
   - **Component-specific:** topbar, table-header, table-stripe, etc. (optional)

2. **Typography** (minimal)
   - Font family (system stack, monospace)
   - Base size (px)
   - Line heights (body, heading, code, dense)
   - Font weights (normal, semi-bold, bold)

3. **Spacing** (optional but encouraged)
   - Padding/margin scale (xs, sm, md, lg, xl in px or multiplier)
   - Or: let components inherit from CSS base + overrides

4. **Sizing**
   - Border-radius scale (subtle, medium, large)
   - Shadows scale (light, medium, heavy)
   - Transition duration scale (fast, standard, slow)

5. **Z-Index Stack** (minimal)
   - Named layers: base, dropdown, modal, tooltip, toast (standardize across modules)

6. **SVG/Images** (optional, but recommended)
   - Logo (light, dark variants)
   - Icons (if applicable; icon set reference)
   - Illustration (if applicable; by semantic role)
   - Favicon (optional)

### Optional Categories (for comprehensive themes only)

- Component-specific token overrides (e.g., button padding, modal width)
- Animation timing functions (ease-in, ease-out, cubic-bezier)
- Opacity transparency tiers (match Facto's `.a05`-`.a25` pattern)

### Schema Structure Proposal

```json
{
  "metadata": {
    "name": "Theme Name",
    "id": "theme-id",
    "description": "...",
    "version": "1.0.0",
    "comprehensive": true,
    "darkModeStrategy": "bifurcated|whole-theme|system-preference"
  },
  "colors": {
    "backgrounds": {
      "base": "#1a1714",
      "surface": "#252018",
      "elevated": "#302818",
      "input": "#1a1714",
      "code": "#151210",
      "overlay": "rgba(0, 0, 0, 0.5)"
    },
    "text": {
      "primary": "#c8b8a0",
      "secondary": "#907860",
      "tertiary": "#706050",
      "muted": "#8A7F72"
    },
    "brand": {
      "primary": "#c4956a",
      "hover": "#d4a57a",
      "alpha_05": "rgba(196, 149, 106, 0.05)"
    },
    "semantic": {
      "success": "#8a9a5a",
      "error": "#b04050",
      "warning": "#c0a050",
      "info": "#4a9090"
    },
    "borders": {
      "primary": "#3a3028",
      "subtle": "#302818",
      "focus": "#c4956a"
    },
    "shadows": {
      "light": "rgba(0, 0, 0, 0.1)",
      "medium": "rgba(0, 0, 0, 0.15)",
      "heavy": "rgba(0, 0, 0, 0.5)"
    },
    "scrollbar": {
      "track": "#252018",
      "thumb": "#3a3028",
      "thumbHover": "#4a4038"
    }
  },
  "typography": {
    "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyMono": "'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', monospace",
    "fontSize": "16px",
    "lineHeights": {
      "body": 1.5,
      "heading": 1.3,
      "code": 1.5
    },
    "fontWeights": {
      "normal": 400,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "scale": ["4px", "8px", "12px", "16px", "24px", "32px"]
  },
  "sizing": {
    "borderRadius": {
      "subtle": "4px",
      "medium": "6px",
      "large": "8px"
    },
    "shadows": {
      "light": "0 1px 3px rgba(0, 0, 0, 0.1)",
      "medium": "0 4px 12px rgba(0, 0, 0, 0.15)",
      "heavy": "0 8px 24px rgba(0, 0, 0, 0.2)"
    }
  },
  "animation": {
    "transitionDuration": {
      "fast": "150ms",
      "standard": "200ms",
      "slow": "300ms"
    },
    "timingFunction": "ease"
  },
  "zIndex": {
    "base": 0,
    "dropdown": 100,
    "modal": 1000,
    "tooltip": 1020,
    "toast": 1030
  },
  "assets": {
    "logo": {
      "light": "/assets/logo-light.svg",
      "dark": "/assets/logo-dark.svg"
    },
    "favicon": "/favicon.svg"
  },
  "components": {
    "button": {
      "padding": "8px 16px",
      "borderRadius": "4px"
    },
    "modal": {
      "width": "480px",
      "borderRadius": "8px"
    }
  }
}
```

### Dark/Light Strategy

**Recommended approach:**
- **Whole-theme bifurcation** (like Ultravisor/Facto): `darkModeStrategy: "whole-theme"` — list separate theme objects for `"light"` and `"dark"` variants
- **Per-token bifurcation:** `darkModeStrategy: "bifurcated"` — each token has `light` and `dark` sub-keys (less common, but Facto's brand transparency pattern hints at demand)
- **System preference:** `darkModeStrategy: "system-preference"` — fallback to `@media (prefers-color-scheme: dark)` if not explicitly toggled

**For non-comprehensive themes:**
- Omit unused categories; consumers inherit from fallback theme
- Example: "Brand Accent Only" theme just overrides `colors.brand.*`

### SVG/Image Classification

**Semantic asset categories:**
- `logo` (app/brand identifier; light/dark variants)
- `favicon` (browser tab icon)
- `icon` (if icon system exists; link to sprite/font)
- `illustration` (decorative; feature-specific, e.g., empty state, hero)
- `background` (pattern or full-page image)

---

## 8. Migration Risk Assessment

### Easy (Low Risk) — Safe to Migrate First

1. **Pict-Section-Modal**
   - Clean, single CSS block in config
   - Already uses CSS variables extensively
   - No hardcoded colors scattered across modules
   - **Migration effort:** Rename `--pict-modal-*` to `--pict-theme-modal-*`, inject from manifest
   - **Source:** `/Users/steven/Code/retold/modules/pict/pict-section-modal/source/Pict-Section-Modal-DefaultConfiguration.js:71-641`

2. **Pict-Section-Code**
   - CSS in configuration, monospace color scheme
   - Syntax highlighting colors hardcoded but straightforward
   - **Migration effort:** Extract colors to token references
   - **Source:** `/Users/steven/Code/retold/modules/pict/pict-section-code/source/Pict-Section-Code-DefaultConfiguration.js:58-120`

3. **Pict-Section-Content**
   - CSS in view configuration; hardcoded warm palette
   - No dependencies on other themes
   - **Migration effort:** Map brown/tan palette to theme tokens
   - **Source:** `/Users/steven/Code/retold/modules/pict/pict-section-content/source/views/Pict-View-Content.js:12-220`

### Medium (Moderate Risk) — Secondary Wave

4. **Pict-Section-Flow (SVG-based)**
   - 80+ CSS variables, already well-structured
   - SVG rendering depends on JS setting fill/stroke (check for hardcodes)
   - Tema integration is partial (flow overrides baked in Facto CSS)
   - **Migration effort:** Generalize flow CSS provider, allow theme-time injection
   - **Source:** `/Users/steven/Code/retold/modules/pict/pict-section-flow/source/providers/PictProvider-Flow-CSS.js:1-300+`

5. **Retold-Facto**
   - Solid CSS structure, 2 themes already in place
   - Tight coupling to flow; overrides baked in theme CSS
   - **Migration effort:** Extract theme file, create manifest, decouple flow overrides
   - **Files:**
     - `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto-themes.css:1-200`
     - `/Users/steven/Code/retold/modules/apps/retold-facto/source/services/web-app/web/css/facto.css:1-500`

### Hard (High Risk) — Late in Migration

6. **Ultravisor**
   - Largest CSS footprint (668 LOC for themes alone)
   - 4 themes with full color palettes, no deltas
   - Heavy integration with form panels (`pict-flow-panel` overrides)
   - **Migration effort:** Audit all 4 themes, normalize color naming, extract to manifest, update UI switcher
   - **Files:**
     - `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor-themes.css:1-668`
     - `/Users/steven/Code/retold/modules/apps/ultravisor/webinterface/css/ultravisor.css:1-144`

7. **Retold-Remote**
   - Largest single CSS file (4714 LOC)
   - Theme variables defined but values not set (incomplete implementation)
   - Complex layout styling that may entangle with tokens
   - **Migration effort:** High—full audit of file, identify layout vs. theme concerns, complete theme definitions
   - **File:** `/Users/steven/Code/retold/modules/apps/retold-remote/css/retold-remote.css:1-4714`

8. **Pict-Section-Form**
   - Complex, uses `CSSClass` property on sections/groups
   - No dedicated CSS config (relies on templates + inline styles)
   - **Migration effort:** Audit form solvers, input extensions; ensure theme tokens don't conflict with form-generated classes
   - **Source:** `/Users/steven/Code/retold/modules/pict/pict-section-form/source/`

### Suggested Migration Order

1. **Phase 1 (Proof of Concept):**
   - Pict-Section-Modal → pict-provider-theme
   - Pict-Section-Code → updated to use theme tokens
   - Retold Content System → migrate to theme

2. **Phase 2 (Breadth):**
   - Pict-Section-Flow → generalize CSS provider
   - Retold-Facto → extract manifest, validate dark/light support

3. **Phase 3 (Depth):**
   - Ultravisor → full theme audit, update UI switcher, test 4 themes
   - Retold-Remote → complete theme definitions, audit layout CSS

4. **Phase 4 (Cleanup):**
   - Pict-Section-Form → ensure no conflicts, test with themed inputs
   - Cross-module integration tests (flow inside Facto, panels in Ultravisor, etc.)

---

## Key Findings & Open Questions

### Headline Findings

1. **CSS variables are already in heavy use** (✅ Good foundation)
   - Modal, Flow, and all major apps use `--*-*` prefix conventions
   - **Gap:** No centralized authority or JS-side token tree

2. **Multi-theme support exists but is incomplete** (⚠️)
   - Ultravisor & Facto have working `data-theme` switchers
   - Retold-Remote has variable references but no runtime theme values
   - No system preference fallback (e.g., `@media (prefers-color-scheme: dark)`)

3. **SVG usage is minimal** (⚠️ Design risk)
   - Only 2 logo assets found; no icon system, no illustrations
   - Pict-Section-Flow generates SVG nodes dynamically (not asset-based)
   - **Implication:** Theme manifest can defer SVG support; add later if needed

4. **Color palettes are diverse but follow semantic categories** (✅)
   - 115+ colors in Ultravisor, but all cluster around bg/text/border/semantic roles
   - **Opportunity:** Normalize naming across apps (e.g., all use `--{app}-border-focus` rather than `--{app}-accent-focus`)

5. **No comprehensive CSS is comprehensive** (⚠️)
   - Every app has gaps (missing states, no disabled variants, etc.)
   - **Implication:** Theme manifest should support "partial" themes (override only what differs)

6. **Hardcoded component sizes vary** (⚠️)
   - Modal width `480px` (hard), button padding `8px 16px` (hard), input padding `0.5em 0.75em` (em-based)
   - **Design decision needed:** Include sizing in theme manifest or leave to component configs?

### Surprising Discoveries

1. **Retold-Remote CSS is 4700+ LOC** but theme is incomplete
   - Variables referenced (`--retold-bg-primary`) but not defined in CSS file
   - Suggests theme is injected at runtime (likely in app init JS)
   - **Risk:** May be harder to extract than expected; inspect app JS

2. **Facto has opacity transparency tiers** (`--facto-brand-a05` through `.a25`)
   - Unique pattern; other apps use full colors only
   - **Design decision:** Include in manifest or make app-specific?

3. **No dark mode ever uses `@media (prefers-color-scheme: dark)`**
   - All are manual theme switching via `data-theme` attribute
   - **Opportunity:** Add system preference fallback in new provider

4. **Pict-Section-Form doesn't define its own CSS**
   - Styles come from input extensions and parent app CSS
   - **Risk:** May be harder to theme than modular sections; defer or handle separately

### Open Questions Requiring Code Inspection

1. **Where is Retold-Remote's theme actually defined?**
   - CSS references `--retold-bg-primary` but `:root {}` not found in CSS file
   - Check: App init JS, web app entry point, or theme provider (not scanned in audit)

2. **How does Ultravisor currently switch themes?**
   - JS listener on `data-theme` attribute? Button in UI?
   - Check: Web app JavaScript, Pict view for theme switcher

3. **Does Pict-Section-Form have any existing theme support?**
   - `CSSClass` property suggests app-level styling, but no tokens
   - Check: Form solvers, input extensions, example app CSS

4. **Are there any animations on theme switch?**
   - CSS transitions suggest smooth fade, but no transition on root/body
   - Consider: Should theme provider add transition class during switch?

5. **Is there a global CSS reset or base styles?**
   - Chota CSS framework mentioned in node_modules; is it active?
   - Check: App HTML entry points, which CSS files are actually loaded

### Design Decisions Required

1. **Should the theme manifest include component-specific sizes?** (modal width, button padding, etc.)
   - **Recommendation:** Yes, for "comprehensive" themes; optional for partial overrides

2. **Should opacity transparency be a first-class token category, or app-specific?**
   - **Recommendation:** First-class (like Facto's `.a05`-`.a25`); enables layering patterns

3. **Should the provider inject `:root` CSS variables, or return a JS token tree for consumers to wire?**
   - **Recommendation:** Both—inject CSS vars for legacy/CSS-only consumers; export JS tree for new jellyfish tag consumers

4. **Should non-comprehensive themes fall back to a "default" theme, or be allowed to break?**
   - **Recommendation:** Fallback with clear error logging; manifest should specify fallback theme ID

5. **What is the scope of "comprehensive"?**
   - **Recommendation:** All semantic token categories + basic component overrides (button, input, modal); exclude per-view micro-tuning

---

## Summary Table

| Category | Status | Effort | Risk | Notes |
|----------|--------|--------|------|-------|
| **Token Catalog** | Partial | High | Medium | 115+ colors across apps; needs normalization |
| **CSS Variables** | ✅ In Use | Low | Low | Already standard practice; rename & scope |
| **JS Token Tree** | ❌ Missing | High | Medium | Must design for jellyfish tag system |
| **Dark Mode** | Partial | Medium | Medium | 2 apps working, 1 incomplete; no sys preference |
| **SVG Assets** | Minimal | Low | Low | Only logos; defer icon system for v2 |
| **Component Library** | De facto | Medium | High | No formal definition; varies per module |
| **Theme Switching** | ✅ Working | Low | Low | `data-theme` attribute pattern proven |
| **Z-Index Stack** | ✅ Defined | Low | Low | Modal layers clear; just standardize names |
| **Manifest Format** | ❌ Missing | High | High | Design decision; JSON structure proposed |

