// Scan all documentation markdown for AI-tell characters & phrases. Read-only.
const fs = require('fs'), path = require('path');

// Collect target markdown: umbrella docs/, each module's docs/ + README.md
function walk(dir, acc) {
	if (!fs.existsSync(dir)) return acc;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (e.name === 'node_modules' || e.name === '.git') continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, acc);
		else if (e.name.toLowerCase().endsWith('.md')) acc.push(p);
	}
	return acc;
}
const files = [];
walk('docs', files);
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];
for (const g of groups) {
	const gdir = path.join('modules', g);
	if (!fs.existsSync(gdir)) continue;
	for (const m of fs.readdirSync(gdir)) {
		walk(path.join('modules', g, m, 'docs'), files);
		const rd = path.join('modules', g, m, 'README.md');
		if (fs.existsSync(rd)) files.push(rd);
	}
}

// char categories
const CH = {
	em_dash: /—/g,
	en_dash: /–/g,
	smart_dquote: /[“”]/g,
	smart_squote: /[‘’]/g,
	ellipsis: /…/g,
	nbsp: / /g,
	zero_width: /[​‌‍﻿]/g,
	arrows: /[←-⇿⬅-⬇]/g,
	check_cross: /[✓✔✗✘✅❌☑]/g,
	bullets_stars: /[•‣▪●■★☆▸▶❖·]/g,
	emoji: /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/gu,
};
// prose tells (case-insensitive word/phrase)
const PROSE = ['delve','leverage','seamless','seamlessly','robust','comprehensive','boasts?','elevate','unleash','harness','cutting-edge','game.?chang','in today\'?s','it\'?s worth noting','dive in','dive into','navigating the','in conclusion','furthermore','moreover','realm of','testament to','tapestry','ever-evolving','fast-paced','look no further','rest assured','needless to say','plethora','myriad','crucial','pivotal','underscore','first and foremost','when it comes to','at the end of the day'];
const proseRe = new RegExp('\\b(' + PROSE.join('|') + ')\\b', 'gi');

const totals = {}; const fileHits = {}; const repoHits = {};
for (const k of Object.keys(CH)) { totals[k] = 0; fileHits[k] = new Set(); }
totals.prose = 0; fileHits.prose = new Set();
const proseCounts = {};
const otherNonAscii = {};

function repoOf(f) {
	const m = f.match(/^modules\/[^/]+\/([^/]+)\//); if (m) return m[1];
	return f.startsWith('docs/') ? '(umbrella)' : '?';
}

for (const f of files) {
	let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
	const repo = repoOf(f);
	for (const [k, re] of Object.entries(CH)) {
		const n = (txt.match(re) || []).length;
		if (n) { totals[k] += n; fileHits[k].add(f); (repoHits[k] ||= new Set()).add(repo); }
	}
	let pm; proseRe.lastIndex = 0;
	const pl = txt.match(proseRe);
	if (pl) { totals.prose += pl.length; fileHits.prose.add(f); for (const w of pl) { const lw = w.toLowerCase(); proseCounts[lw] = (proseCounts[lw] || 0) + 1; } }
	// catch-all other non-ASCII (not already categorized, not normal accented letters we want to keep)
	for (const ch of txt) {
		const cp = ch.codePointAt(0);
		if (cp < 128) continue;
		let known = false;
		for (const re of Object.values(CH)) { re.lastIndex = 0; if (re.test(ch)) { known = true; break; } }
		if (known) continue;
		const key = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ' ' + ch;
		otherNonAscii[key] = (otherNonAscii[key] || 0) + 1;
	}
}

console.log('=== Markdown files scanned: ' + files.length + ' ===\n');
console.log('CHARACTER TELLS  (occurrences / files / repos):');
for (const k of Object.keys(CH)) {
	if (totals[k]) console.log(`  ${k.padEnd(14)} ${String(totals[k]).padStart(5)} occ   ${String(fileHits[k].size).padStart(4)} files   ${(repoHits[k]||new Set()).size} repos`);
}
console.log('\nPROSE TELLS: ' + totals.prose + ' occurrences in ' + fileHits.prose.size + ' files');
const ps = Object.entries(proseCounts).sort((a,b)=>b[1]-a[1]);
console.log('  ' + ps.map(([w,n])=>`${w}:${n}`).join('  '));
console.log('\nOTHER non-ASCII codepoints seen (review — may include legitimate chars):');
const oa = Object.entries(otherNonAscii).sort((a,b)=>b[1]-a[1]).slice(0, 30);
for (const [k,n] of oa) console.log(`  ${k}  ×${n}`);
const allRepos = new Set(); for (const k of Object.keys(CH)) for (const r of (repoHits[k]||[])) allRepos.add(r); for (const f of fileHits.prose) allRepos.add(repoOf(f));
console.log('\nDistinct repos/areas with at least one tell: ' + allRepos.size);
