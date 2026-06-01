// After more docs sites go live, upgrade the repo-fallback cross-references in
// DOCUMENTATION (module docs + umbrella docs) to point at the now-live docs
// sites. Module READMEs are intentionally NOT touched (README -> repos is the
// model). Reads the current liveness probe from /tmp/docs_live.txt.
// Skips affordance link text (github/source/repo) and intentional
// [github.com/...] repo-display links. Dry-run by default; pass --apply.
const fs = require('fs'), path = require('path');
const man = require('./Retold-Modules-Manifest.json');

const mods = [];
for (const g of man.Groups) for (const m of g.Modules) mods.push(m);
const isTop = (m) => (m.Path || '').split('/').length === 3;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LIVE = new Set();
for (const ln of fs.readFileSync('/tmp/docs_live.txt', 'utf8').split('\n'))
{
	const mm = ln.match(/^200\s+(\S+)\s/); if (mm) { LIVE.add(mm[1]); }
}
const EXCLUDE = new Set(['github', 'source', 'repo', 'repository', 'code', 'git']);
const APPLY = process.argv.includes('--apply');

function walk(d, a)
{
	if (!fs.existsSync(d)) { return a; }
	for (const e of fs.readdirSync(d, { withFileTypes: true }))
	{
		if (e.name === 'node_modules' || e.name === '.git') { continue; }
		const p = path.join(d, e.name);
		if (e.isDirectory()) { walk(p, a); }
		else if (e.name.toLowerCase().endsWith('.md')) { a.push(p); }
	}
	return a;
}

// Documentation dirs only: each module's docs/, plus the umbrella docs/.
const docDirs = mods.filter(isTop).map((m) => path.join(m.Path, 'docs')).concat(['docs']);
const files = [];
for (const d of docDirs) { walk(d, files); }

let total = 0, perMod = {};
for (const f of files)
{
	let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
	const before = txt;
	// Owning module of this file (so a module's docs don't rewrite links to
	// their own repo) -- umbrella docs have no owner, so all refs are cross-refs.
	const own = f.match(/^modules\/[^/]+\/([^/]+)\/docs\//);
	const ownMod = own ? own[1] : null;
	for (const o of mods)
	{
		if (o.Name === ownMod) { continue; }
		if (!o.GitHub || !o.Documentation || !LIVE.has(o.Name)) { continue; }
		const re = new RegExp('\\[([^\\]]*)\\]\\(' + escapeRe(o.GitHub) + '/?\\)', 'g');
		txt = txt.replace(re, (whole, text) =>
		{
			const t = text.trim().toLowerCase();
			if (EXCLUDE.has(t) || t.includes('github.com')) { return whole; }
			perMod[o.Name] = (perMod[o.Name] || 0) + 1; total++;
			return '[' + text + '](' + o.Documentation + ')';
		});
	}
	if (txt !== before && APPLY) { fs.writeFileSync(f, txt); }
}

console.log((APPLY ? 'APPLIED' : 'DRY-RUN') + ': upgraded ' + total + ' repo links -> docs sites');
const ent = Object.entries(perMod).sort((a, b) => b[1] - a[1]);
console.log(ent.map(([k, v]) => '  ' + k + ': ' + v).join('\n'));
