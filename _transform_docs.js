// Normalize AI-tell characters + targeted prose in all documentation markdown.
// PRESERVES box-drawing diagrams (U+2500-257F) and math symbols. Emoji handled separately.
const fs = require('fs'), path = require('path');

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
for (const g of ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps']) {
	const gd = path.join('modules', g);
	if (!fs.existsSync(gd)) continue;
	for (const m of fs.readdirSync(gd)) {
		walk(path.join('modules', g, m, 'docs'), files);
		const r = path.join('modules', g, m, 'README.md');
		if (fs.existsSync(r)) files.push(r);
	}
}

const BOX = /[─-╿]/;            // box-drawing — protect diagram lines from width changes
const PROSE = [
	[/\bLeverages\b/g, 'Uses'], [/\bleverages\b/g, 'uses'],
	[/\bLeveraging\b/g, 'Using'], [/\bleveraging\b/g, 'using'],
	[/\bLeveraged\b/g, 'Used'], [/\bleveraged\b/g, 'used'],
	[/\bLeverage\b/g, 'Use'], [/\bleverage\b/g, 'use'],
	[/\bSeamlessly\b/g, 'Smoothly'], [/\bseamlessly\b/g, 'smoothly'],
	[/\bSeamless\b/g, 'Smooth'], [/\bseamless\b/g, 'smooth'],
	[/\bDive into\b/g, 'Look at'], [/\bdive into\b/g, 'look at'],
	[/\bDive in\b/g, 'Jump in'], [/\bdive in\b/g, 'jump in'],
];

function entitySub(line) {
	// AI-tell HTML entities (NOT &amp; &lt; &gt; &quot; — those are legitimate escaping)
	return line
		.replace(/&#9654;\s*/g, '').replace(/&#x25[Bb]6;\s*/g, '')
		.replace(/&mdash;/g, '-').replace(/&ndash;/g, '-')
		.replace(/&hellip;/g, '...')
		.replace(/&rarr;/g, '->').replace(/&larr;/g, '<-').replace(/&harr;/g, '<->')
		.replace(/&bull;/g, '-').replace(/&middot;/g, '-');
}
function charLine(line) {
	// width-preserving 1:1 substitutions — safe on every line (incl. diagrams)
	line = line.replace(/[—–]/g, '-').replace(/·/g, '-').replace(/[•‣▪❖●■]/g, '-');
	const box = BOX.test(line);
	if (!box) {
		// width-changing substitutions — only off diagram lines
		line = line.replace(/…/g, '...');
		line = line.replace(/\*\*▶\*\*\s*play button/g, 'play button')
			.replace(/\*\*▶\*\*\s*button/g, 'play button')
			.replace(/\*\*▶\*\*/g, 'play')
			.replace(/▶/g, 'play');
		line = line.replace(/↔/g, '<->').replace(/→/g, '->').replace(/←/g, '<-').replace(/⇒/g, '=>');
	} else {
		line = line.replace(/▶/g, '-');
	}
	return line;
}

let changed = []; const byRepo = {};
function repoOf(f) { const m = f.match(/^modules\/[^/]+\/([^/]+)\//); return m ? m[1] : '(umbrella)'; }

for (const f of files) {
	let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
	const lines = txt.split('\n');
	let fence = false;
	for (let i = 0; i < lines.length; i++) {
		if (/^\s*```/.test(lines[i])) { fence = !fence; lines[i] = charLine(lines[i]); continue; }
		lines[i] = charLine(lines[i]);
		if (!fence) {
			lines[i] = entitySub(lines[i]);
			for (const [re, r] of PROSE) lines[i] = lines[i].replace(re, r);
		}
	}
	const out = lines.join('\n');
	if (out !== txt) { fs.writeFileSync(f, out); changed.push(f); const rk = repoOf(f); byRepo[rk] = (byRepo[rk] || 0) + 1; }
}

console.log('Files changed: ' + changed.length + '  across ' + Object.keys(byRepo).length + ' repos/areas');
const reps = Object.entries(byRepo).sort((a, b) => b[1] - a[1]);
console.log(reps.map(([r, n]) => `  ${r}: ${n}`).join('\n'));
