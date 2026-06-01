// Audit license per module: package.json license field, LICENSE file + type,
// README license badge presence. Flags non-MIT and inconsistencies. Read-only.
const fs = require('fs'), path = require('path');
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];

function licenseFileType(dir) {
	for (const n of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'License']) {
		const p = path.join(dir, n);
		if (fs.existsSync(p)) {
			const head = fs.readFileSync(p, 'utf8').slice(0, 400);
			let type = 'other';
			if (/MIT License/i.test(head) || /Permission is hereby granted, free of charge/i.test(head)) type = 'MIT';
			else if (/Apache License/i.test(head)) type = 'Apache';
			else if (/GNU GENERAL PUBLIC/i.test(head)) type = 'GPL';
			else if (/BSD/i.test(head)) type = 'BSD';
			else if (/UNLICENSED|proprietary|all rights reserved/i.test(head)) type = 'proprietary';
			return { file: n, type };
		}
	}
	return { file: null, type: null };
}

const rows = [];
for (const g of groups) {
	const gd = path.join('modules', g);
	if (!fs.existsSync(gd)) continue;
	for (const m of fs.readdirSync(gd)) {
		const dir = path.join(gd, m);
		if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
		let pkgLicense = '(none)';
		try { pkgLicense = require(path.resolve(dir, 'package.json')).license || '(none)'; } catch (e) {}
		const lf = licenseFileType(dir);
		const readme = path.join(dir, 'README.md');
		let badge = false, section = false;
		if (fs.existsSync(readme)) {
			const t = fs.readFileSync(readme, 'utf8');
			badge = /shields\.io\/badge\/[Ll]icense/.test(t);
			section = /^#+\s*License/im.test(t) || /licensed under/i.test(t);
		}
		rows.push({ mod: g + '/' + m, pkg: pkgLicense, lfile: lf.file ? lf.type : '(no file)', badge, section });
	}
}

const nonMIT = rows.filter(r => (r.pkg !== 'MIT' && r.pkg !== '(none)') || (r.lfile !== 'MIT' && r.lfile !== '(no file)'));
const missing = rows.filter(r => r.pkg === '(none)' || r.lfile === '(no file)');
console.log('Total modules: ' + rows.length);
console.log('\n=== NON-MIT (pkg or LICENSE file not MIT) ===');
if (!nonMIT.length) console.log('  (none)');
for (const r of nonMIT) console.log(`  ${r.mod.padEnd(42)} pkg=${r.pkg}  LICENSE=${r.lfile}`);
console.log('\n=== MISSING license field or LICENSE file ===');
for (const r of missing) console.log(`  ${r.mod.padEnd(42)} pkg=${r.pkg}  LICENSE=${r.lfile}`);
console.log('\n=== pkg.license vs LICENSE-file MISMATCH ===');
for (const r of rows) if (r.pkg !== '(none)' && r.lfile !== '(no file)' && r.pkg !== r.lfile) console.log(`  ${r.mod.padEnd(42)} pkg=${r.pkg}  LICENSE=${r.lfile}`);
console.log('\n=== READMEs with a License BADGE: ' + rows.filter(r => r.badge).length + '  | with a License SECTION: ' + rows.filter(r => r.section).length + ' ===');
