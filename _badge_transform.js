// Replace README badges with plain text:
//  - npm-version (badge.fury.io) badge -> [<pkg> on npm](npmjs link)
//  - License (shields.io) badge        -> [MIT License](LICENSE)  (proprietary for retold-facto)
//  - GitHub-Actions build badge        -> removed (broken, no workflows)
// Collapses the badge block into one clean " | "-separated line of plain links.
const fs = require('fs'), path = require('path');
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];

const reNpm = /badge\.fury\.io\/js\/([^.]+)\.svg/;
const reLic = /shields\.io\/badge\/[Ll]icense/;
const reGh = /github\.com\/[^)]*\/workflows\/[^)]*badge\.svg/;
const isBadgeLine = (l) => reNpm.test(l) || reLic.test(l) || reGh.test(l);

let changed = [];
for (const g of groups) {
	const gd = path.join('modules', g);
	if (!fs.existsSync(gd)) continue;
	for (const m of fs.readdirSync(gd)) {
		const f = path.join(gd, m, 'README.md');
		if (!fs.existsSync(f)) continue;
		const txt = fs.readFileSync(f, 'utf8');
		const lines = txt.split('\n');
		let pkg = null, hasLic = false, firstBadge = -1;
		const badgeIdx = new Set();
		for (let i = 0; i < lines.length; i++) {
			if (!isBadgeLine(lines[i])) continue;
			badgeIdx.add(i);
			if (firstBadge < 0) firstBadge = i;
			const nm = lines[i].match(reNpm); if (nm) pkg = nm[1];
			if (reLic.test(lines[i])) hasLic = true;
		}
		if (!badgeIdx.size) continue;
		const parts = [];
		if (pkg) parts.push(`[${pkg} on npm](https://www.npmjs.com/package/${pkg})`);
		if (hasLic) parts.push((g + '/' + m === 'apps/retold-facto')
			? `[Proprietary - All Rights Reserved](LICENSE)`
			: `[MIT License](LICENSE)`);
		const replacement = parts.join(' | ');
		const out = [];
		let inserted = false;
		for (let i = 0; i < lines.length; i++) {
			if (badgeIdx.has(i)) { if (!inserted && replacement) { out.push(replacement); inserted = true; } }
			else out.push(lines[i]);
		}
		const result = out.join('\n');
		if (result !== txt) { fs.writeFileSync(f, result); changed.push(g + '/' + m); }
	}
}
console.log('READMEs changed: ' + changed.length);
changed.forEach(c => console.log('  ' + c));
