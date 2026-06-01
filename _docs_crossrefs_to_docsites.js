// In module docs/*.md, convert markdown cross-references to OTHER in-ecosystem
// modules from GitHub-repo links to docs-site links (per the ecosystem link
// model: in-documentation links point at other docs sites). Only converts when
// the target docs site is LIVE (200) and the link text is a name, not a
// "github/source/repo" affordance. Dry-run by default; pass --apply.
const fs = require('fs'), path = require('path');
const man = require('./Retold-Modules-Manifest.json');

const mods = [];
for (const g of man.Groups) for (const m of g.Modules) mods.push(m);
const isTop = (m) => (m.Path || '').split('/').length === 3;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Live docs sites (200) from the liveness probe.
const LIVE = new Set();
for (const ln of fs.readFileSync('/tmp/docs_live.txt', 'utf8').split('\n'))
{
	const mm = ln.match(/^200\s+(\S+)\s/);
	if (mm) { LIVE.add(mm[1]); }
}
const EXCLUDE = new Set(['github', 'source', 'repo', 'repository', 'code', 'git']);
const APPLY = process.argv.includes('--apply');

function walk(d, acc)
{
	if (!fs.existsSync(d)) { return acc; }
	for (const e of fs.readdirSync(d, { withFileTypes: true }))
	{
		if (e.name === 'node_modules' || e.name === '.git') { continue; }
		const p = path.join(d, e.name);
		if (e.isDirectory()) { walk(p, acc); }
		else if (e.name.toLowerCase().endsWith('.md')) { acc.push(p); }
	}
	return acc;
}

let totRepl = 0, totFiles = 0, perMod = {};
for (const m of mods.filter(isTop))
{
	let modRepl = 0;
	for (const f of walk(path.join(m.Path, 'docs'), []))
	{
		let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
		const before = txt;
		for (const o of mods)
		{
			if (o.Name === m.Name || !o.GitHub || !o.Documentation || !LIVE.has(o.Name)) { continue; }
			// [text](repo) or [text](repo/) -> [text](docs site), unless text is a repo affordance
			const re = new RegExp('\\[([^\\]]*)\\]\\(' + escapeRe(o.GitHub) + '/?\\)', 'g');
			txt = txt.replace(re, (whole, text) =>
			{
				if (EXCLUDE.has(text.trim().toLowerCase())) { return whole; }
				modRepl++;
				return '[' + text + '](' + o.Documentation + ')';
			});
		}
		if (txt !== before) { if (APPLY) { fs.writeFileSync(f, txt); } totFiles++; }
	}
	if (modRepl) { perMod[m.Name] = modRepl; totRepl += modRepl; }
}

console.log((APPLY ? 'APPLIED' : 'DRY-RUN') + ': ' + totRepl + ' cross-refs -> docs sites across ' + totFiles + ' files in ' + Object.keys(perMod).length + ' modules');
const ent = Object.entries(perMod).sort((a, b) => b[1] - a[1]);
console.log(ent.map(([k, v]) => '  ' + k + ': ' + v).join('\n'));
