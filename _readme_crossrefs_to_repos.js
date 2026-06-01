// Convert module README cross-references to OTHER in-ecosystem modules so they
// point at those modules' GitHub repos instead of their docs sites (per the
// ecosystem link model). A module's OWN docs banner is left untouched.
// Dry-run by default; pass --apply to write.
const fs = require('fs'), path = require('path');
const man = require('./Retold-Modules-Manifest.json');

const mods = [];
for (const g of man.Groups) for (const m of g.Modules) mods.push(m);
const isTop = (m) => (m.Path || '').split('/').length === 3;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const APPLY = process.argv.includes('--apply');

let totalRepos = 0, totalRepl = 0, perRepo = {};
for (const m of mods.filter(isTop))
{
	const rp = path.join(m.Path, 'README.md');
	if (!fs.existsSync(rp)) { continue; }
	let txt = fs.readFileSync(rp, 'utf8');
	const before = txt;
	let count = 0;
	const detail = [];

	for (const other of mods)
	{
		if (other.Name === m.Name || !other.Documentation || !other.GitHub) { continue; }
		// docs-site URL (trailing slash kept -> no prefix false-matches), with an
		// optional #/deep-link path that we drop when pointing at the repo.
		const re = new RegExp(escapeRe(other.Documentation) + '(#/[\\w/.-]*)?', 'g');
		txt = txt.replace(re, (mch) => { count++; detail.push(other.Name); return other.GitHub; });
	}

	if (txt !== before)
	{
		if (APPLY) { fs.writeFileSync(rp, txt); }
		totalRepos++; totalRepl += count;
		perRepo[m.Name] = count;
		const tally = {}; for (const d of detail) tally[d] = (tally[d] || 0) + 1;
		console.log('--- ' + m.Name + '  (' + count + ' link(s) -> repos): '
			+ Object.entries(tally).map(([k, v]) => k + (v > 1 ? 'x' + v : '')).join(', '));
	}
}
console.log('\n' + (APPLY ? 'APPLIED' : 'DRY-RUN') + ': ' + totalRepl + ' links across ' + totalRepos + ' READMEs');
