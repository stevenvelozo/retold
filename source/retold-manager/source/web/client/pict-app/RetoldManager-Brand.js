/**
 * RetoldManager-Brand — the application's wordmark / signature.
 *
 * Passed to pict-section-theme as the `Brand` block on the Theme-Section
 * provider. Drives:
 *   - The Theme-Brand-Mark view in the topbar (icon + name)
 *   - --brand-color-* CSS variables that themes / app CSS reference
 *   - The Favicon / FaviconDark SVGs available via libThemeBrand
 *
 * The brand is precomputed at build time. Source of truth lives in
 * `Retold-Modules-Manifest.json` under this module's `Branding.Palette`
 * field; the `pict-section-theme-brand` CLI generates the deterministic
 * logo + colors and writes them into our `package.json` under
 * `retold.brand`. This file then just hands that block to Theme-Section.
 *
 * To change the look:
 *
 *   1. Edit the Branding block in Retold-Modules-Manifest.json (palette,
 *      DisplayName, Tagline).
 *   2. Run `npm run brand` to regenerate package.json + favicon files.
 *   3. Run `npx quack build` to rebuild the bundle.
 *
 * Curated palette keys: mix, default, desert, ocean, forest, synthwave,
 * twilight, cosmos, carnival.
 *
 * Why precompute? It keeps the LogoGenerator dependency out of the
 * runtime bundle (smaller download), the brand becomes auditable in
 * source control (every change shows up as a package.json diff), and
 * any tool that reads package.json can introspect the brand without
 * needing to evaluate JS.
 */

// Path: source/web/client/pict-app/ → up 4 to retold-manager/.
const tmpPackage = require('../../../../package.json');

if (!tmpPackage.retold || !tmpPackage.retold.brand)
{
	throw new Error('retold-manager: package.json is missing retold.brand — '
		+ 'run `npm run brand` (which calls pict-section-theme-brand) before building');
}

module.exports = tmpPackage.retold.brand;
