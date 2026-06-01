// Enumerate every standalone live example app across all modules, with metadata.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function owner(moddir) {
	for (const r of ['upstream', 'origin']) {
		try {
			const url = cp.execSync(`git -C "${moddir}" remote get-url ${r}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
			const m = url.match(/[:/]([^/]+)\/[^/]+?(?:\.git)?$/);
			if (m) return m[1];
		} catch (e) {}
	}
	return null;
}
function curl(url) {
	try { return cp.execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
	catch (e) { return 'ERR'; }
}
// pull ExampleApplication metadata from the example's source package.json (several candidate locations)
function meta(moddir, exname) {
	const cands = [
		path.join(moddir, 'example_applications', exname, 'package.json'),
		path.join(moddir, 'examples', exname, 'package.json'),
		path.join(moddir, 'docs', 'examples', exname, 'package.json'),
	];
	for (const c of cands) {
		const j = readJSON(c);
		const e = j && j.retold && j.retold.ExampleApplication;
		if (e) return { title: e.Title || exname, summary: e.Summary || '', complexity: e.Complexity || '' };
	}
	return { title: exname, summary: '', complexity: '' };
}

const out = [];
for (const g of groups) {
	const gdir = path.join('modules', g);
	if (!fs.existsSync(gdir)) continue;
	for (const m of fs.readdirSync(gdir)) {
		const moddir = path.join(gdir, m);
		const exdir = path.join(moddir, 'docs', 'examples');
		if (!fs.existsSync(exdir)) continue;
		const ow = owner(moddir);
		for (const ex of fs.readdirSync(exdir)) {
			const idx = path.join(exdir, ex, 'index.html');
			// some examples nest the index under a dist/ subdir (e.g. pict hello_world)
			const idxDist = path.join(exdir, ex, 'dist', 'index.html');
			let rel = null;
			if (fs.existsSync(idx)) rel = `examples/${ex}/`;
			else if (fs.existsSync(idxDist)) rel = `examples/${ex}/dist/`;
			else continue;
			const liveURL = `https://${ow}.github.io/${m}/${rel}`;
			const md = meta(moddir, ex);
			out.push({ group: g, module: m, owner: ow, example: ex, rel, liveURL, docURL: `https://${ow}.github.io/${m}/`, code: curl(liveURL), ...md });
		}
	}
}
out.sort((a, b) => (a.group + a.module + a.example).localeCompare(b.group + b.module + b.example));
console.log('TOTAL example apps found: ' + out.length);
const live = out.filter(x => x.code === '200');
console.log('Live (HTTP 200): ' + live.length + '   Not-200: ' + (out.length - live.length));
console.log('');
for (const x of out) {
	console.log(`[${x.code}] ${x.group}/${x.module} :: ${x.example}  (${x.complexity || '—'})`);
	console.log(`      ${x.title}${x.summary ? ' — ' + x.summary.slice(0, 90) : ''}`);
}
fs.writeFileSync('_examples_catalog.json', JSON.stringify(out, null, '\t'));
console.log('\n→ wrote _examples_catalog.json');
