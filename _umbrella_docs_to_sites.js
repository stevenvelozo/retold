// Umbrella docs: convert internal (/group/module/) docsify routes to external
// module documentation sites (per the ecosystem link model: umbrella docs link
// to module docs sites). Modules without a live docs site fall back to their
// GitHub repo (a working link beats a 404). Only genuine group/module pairs are
// touched; internal umbrella routes (/architecture/x, /modules/x) are left alone.
// Dry-run by default; pass --apply.
const fs = require('fs'), path = require('path');
const man = require('./Retold-Modules-Manifest.json');

const byName = {};
const validPairs = new Set();
for (const g of man.Groups)
{
	const gkey = g.Path.split('/').pop();
	for (const m of g.Modules) { byName[m.Name] = m; validPairs.add(gkey + '/' + m.Name); }
}

const LIVE = new Set();
for (const ln of fs.readFileSync('/tmp/docs_live.txt', 'utf8').split('\n'))
{
	const mm = ln.match(/^200\s+(\S+)\s/); if (mm) { LIVE.add(mm[1]); }
}

const APPLY = process.argv.includes('--apply');

function walk(d, a)
{
	if (!fs.existsSync(d)) { return a; }
	for (const e of fs.readdirSync(d, { withFileTypes: true }))
	{
		if (e.name === 'node_modules') { continue; }
		const p = path.join(d, e.name);
		if (e.isDirectory()) { walk(p, a); }
		else if (e.name.endsWith('.md')) { a.push(p); }
	}
	return a;
}

let toDocs = 0, toRepo = 0, perFile = {}, skipped = {};
for (const f of walk('docs', []))
{
	let txt = fs.readFileSync(f, 'utf8');
	let n = 0;
	txt = txt.replace(/\]\(\/([a-z]+)\/([a-z0-9-]+)\/?\)/g, (whole, grp, mod) =>
	{
		if (!validPairs.has(grp + '/' + mod)) { skipped[grp + '/' + mod] = (skipped[grp + '/' + mod] || 0) + 1; return whole; }
		const m = byName[mod];
		const useDocs = LIVE.has(mod) && m.Documentation;
		const target = useDocs ? m.Documentation : m.GitHub;
		if (useDocs) { toDocs++; } else { toRepo++; }
		n++;
		return '](' + target + ')';
	});
	if (n > 0) { perFile[f.replace('docs/', '')] = n; if (APPLY) { fs.writeFileSync(f, txt); } }
}

console.log((APPLY ? 'APPLIED' : 'DRY-RUN') + ': ' + (toDocs + toRepo) + ' routes converted -> ' + toDocs + ' docs-site, ' + toRepo + ' repo (no live docs)');
console.log('per file:'); for (const [f, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1])) { console.log('  ' + n + '  ' + f); }
const sk = Object.entries(skipped).sort((a, b) => b[1] - a[1]);
if (sk.length) { console.log('left as internal routes (not group/module pairs):'); console.log('  ' + sk.map(([k, v]) => k + 'x' + v).join(', ')); }
