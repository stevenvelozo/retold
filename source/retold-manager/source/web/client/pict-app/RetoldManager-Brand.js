/**
 * RetoldManager-Brand — the application's wordmark / signature.
 *
 * Passed to pict-section-theme.install({ Brand: ... }) at boot. Drives
 * the BrandStrip view below the topbar (two stripes + icon + name) and
 * exposes --brand-color-* CSS variables that themes / app CSS can
 * reference for accents.
 *
 * Colors chosen to harmonise with the retold-manager dark + light
 * palettes (which lean GitHub-blue) without clashing on either side.
 *
 * Icon is an inline SVG so it themes via currentColor and ships in the
 * bundle (no extra HTTP request).
 */

const _RETOLD_MANAGER_ICON_SVG = ''
	// Stylised "R-M" mark: an R with a small bracket beneath, drawn in
	// line-art so it scales cleanly and inherits brand color via currentColor.
	+ '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"'
	+ ' stroke="currentColor" stroke-width="2" stroke-linecap="round"'
	+ ' stroke-linejoin="round" aria-hidden="true">'
	+ '<path d="M5 4h7a4 4 0 0 1 0 8H7"/>'
	+ '<path d="M7 12l5 8"/>'
	+ '<path d="M5 4v16"/>'
	+ '<path d="M16 16l3 4 3-4"/>'
	+ '</svg>';

module.exports =
{
	Hash: 'retold-manager',
	Name: 'Retold Manager',
	Tagline: 'Status, update, ripple-publish across every Retold module',
	Icon: _RETOLD_MANAGER_ICON_SVG,
	IconType: 'svg',
	Colors:
	{
		// GitHub-issue-blue for primary, warm orange-coral for secondary.
		// Both have light + dark variants tuned so the brand stripe stays
		// vivid on either backdrop and the H1/H2 underlines from
		// retold-default/retold-mono read cleanly.
		Primary:        '#2f81f7',
		Secondary:      '#ff8a3d',
		PrimaryLight:   '#0969da',
		PrimaryDark:    '#58a6ff',
		SecondaryLight: '#cc5a14',
		SecondaryDark:  '#ffa869'
	}
};
