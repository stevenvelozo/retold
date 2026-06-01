// Add a prominent docs-site banner to module READMEs that lack one.
// Only operates on an explicit allow-list (modules whose docs site is verified live).
// Dry-run by default; pass --apply to write.
const fs = require('fs'), path = require('path');
const man = require('./Retold-Modules-Manifest.json');

const byName = {};
for (const g of man.Groups) for (const m of g.Modules) byName[m.Name] = m;

// Verified-live docs sites (200) among the banner-less top-level modules.
const LIVE = [
	'fable', 'fable-uuid', 'pict-editor-timeline', 'pict-meadow-connection-manager',
	'pict-nonlinearconfig', 'pict-section-connection-form', 'pict-section-flow',
	'pict-section-histogram', 'pict-section-modal', 'pict-section-theme', 'pict-view',
	'ultravisor-beacon-capability'
];

const APPLY = process.argv.includes('--apply');

// Extract the display name from the first markdown title (ATX or Setext),
// and return { display, insertAfterIndex } so the banner lands right below it.
function findTitle(pLines)
{
	for (let i = 0; i < pLines.length && i < 30; i++)
	{
		let tmpAtx = pLines[i].match(/^#\s+(.+?)\s*#*\s*$/);
		if (tmpAtx) { return { display: tmpAtx[1].trim(), at: i }; }
		// Setext: a non-blank line followed by a run of = (or -) underline
		if (pLines[i].trim() && /^=+\s*$/.test(pLines[i + 1] || ''))
		{
			return { display: pLines[i].trim(), at: i + 1 };
		}
	}
	return null;
}

let done = [], skipped = [];
for (const name of LIVE)
{
	const m = byName[name];
	if (!m || !m.Documentation) { skipped.push(name + ' (no manifest doc url)'); continue; }
	const rp = path.join(m.Path, 'README.md');
	if (!fs.existsSync(rp)) { skipped.push(name + ' (no README)'); continue; }
	let txt = fs.readFileSync(rp, 'utf8');
	const lines = txt.split('\n');
	// Skip only if a PROMINENT top banner already exists (doc url in the head);
	// a deep "full documentation is available at..." mention does not count.
	if (lines.slice(0, 15).join('\n').includes(m.Documentation)) { skipped.push(name + ' (top banner present)'); continue; }

	const t = findTitle(lines);
	if (!t) { skipped.push(name + ' (no title found)'); continue; }

	const banner = '> **[Read the ' + t.display + ' Documentation](' + m.Documentation + ')**';

	// Insert after the title line with exactly one blank line on each side,
	// absorbing the title's existing trailing blank line so we don't double it.
	const rest = lines.slice(t.at + 1);
	if ((rest[0] || '').trim() === '') { rest.shift(); }
	const newLines = lines.slice(0, t.at + 1).concat([''], [banner], [''], rest);

	const out = newLines.join('\n');
	if (APPLY) { fs.writeFileSync(rp, out); }
	done.push(name);
	console.log('--- ' + name + '  (' + rp + ')');
	console.log('    title : ' + t.display);
	console.log('    banner: ' + banner);
}

console.log('\n' + (APPLY ? 'APPLIED' : 'DRY-RUN') + ' banners: ' + done.length + ' | skipped: ' + skipped.length);
if (skipped.length) console.log('  skipped: ' + skipped.join('; '));
