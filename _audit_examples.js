// Audit live examples: for every module's docs/, verify that standalone example
// HTML pages reference files that actually exist, and that playground imports exist.
// Read-only. Flags the "built/copied incompletely" failure mode (silent non-launch).
const fs = require('fs'), path = require('path');
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];

function htmlFiles(dir) {
	let out = [];
	if (!fs.existsSync(dir)) return out;
	(function walk(d) {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			if (e.name === 'node_modules') continue;
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith('.html')) out.push(p);
		}
	})(dir);
	return out;
}

let report = [];
for (const g of groups) {
	const gdir = 'modules/' + g;
	if (!fs.existsSync(gdir)) continue;
	for (const m of fs.readdirSync(gdir)) {
		const moddir = path.join(gdir, m);
		const docs = path.join(moddir, 'docs');
		if (!fs.existsSync(docs)) continue;
		let issues = [];
		// Standalone example/playground HTML (NOT the docuserve shell docs/index.html, which loads from CDN)
		const htmls = [...htmlFiles(path.join(docs, 'examples')), ...htmlFiles(path.join(docs, 'playground'))];
		for (const h of htmls) {
			const dir = path.dirname(h);
			const src = fs.readFileSync(h, 'utf8');
			const refs = [...src.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map(x => x[1]);
			for (const r of refs) {
				if (/^(https?:)?\/\//.test(r) || r.startsWith('data:') || r.startsWith('#') || r.startsWith('mailto:')) continue;
				const rr = r.split('?')[0].split('#')[0];
				if (!rr) continue;
				const resolved = rr.startsWith('/') ? path.join(docs, rr.slice(1)) : path.join(dir, rr);
				if (!fs.existsSync(resolved)) {
					const ext = path.extname(rr).toLowerCase();
					const sev = (ext === '.js') ? 'LAUNCH-BREAKING' : (ext === '.css') ? 'styling' : 'asset';
					issues.push(`[${sev}] ${path.relative(docs, h)} → missing ${r}`);
				}
			}
		}
		// Playground imports
		const pj = path.join(docs, '_playground.json');
		if (fs.existsSync(pj)) {
			try {
				const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
				for (const imp of (j.Imports || [])) {
					if (imp && imp.Source === 'local' && imp.Path && !fs.existsSync(path.join(docs, imp.Path)))
						issues.push(`[LAUNCH-BREAKING] playground import → missing ${imp.Path}`);
				}
			} catch (e) { issues.push('[error] _playground.json parse failed: ' + e.message); }
		}
		if (issues.length) report.push({ m: g + '/' + m, issues });
	}
}
console.log('=== Modules with broken example references: ' + report.length + ' ===');
for (const r of report) { console.log('\n' + r.m); for (const i of r.issues) console.log('   ' + i); }
if (!report.length) console.log('(none — all example references resolve)');
