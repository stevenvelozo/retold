// License metadata pass:
//  - add MIT LICENSE file to MIT repos missing one (copyright year = first commit year)
//  - fix orator-serviceserver-base package.json ISC -> MIT
//  - retold-facto + ultravisor-lab: package.json -> UNLICENSED, proprietary LICENSE file
const fs = require('fs'), path = require('path'), cp = require('child_process');
const groups = ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps'];
const PROPRIETARY = new Set(['apps/retold-facto', 'apps/ultravisor-lab']);

function mitText(year) {
	return `The MIT License (MIT)\n\nCopyright (c) ${year} Steven Velozo\n\n` +
`Permission is hereby granted, free of charge, to any person obtaining a copy\n` +
`of this software and associated documentation files (the "Software"), to deal\n` +
`in the Software without restriction, including without limitation the rights\n` +
`to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n` +
`copies of the Software, and to permit persons to whom the Software is\n` +
`furnished to do so, subject to the following conditions:\n\n` +
`The above copyright notice and this permission notice shall be included in all\n` +
`copies or substantial portions of the Software.\n\n` +
`THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n` +
`IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n` +
`FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n` +
`AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n` +
`LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n` +
`OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n` +
`SOFTWARE.\n`;
}
function proprietaryText(year) {
	return `Copyright (c) ${year} Steven Velozo\n\nAll Rights Reserved.\n\n` +
`This software and its associated documentation and data files are proprietary\n` +
`and confidential. No part of this software may be copied, modified, distributed,\n` +
`published, or used in any form or by any means without the prior written\n` +
`permission of the copyright holder.\n`;
}
function firstYear(dir) {
	try { return cp.execSync(`git -C "${dir}" log --max-parents=0 --date=format:%Y --format=%ad`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n').pop() || '2026'; }
	catch (e) { return '2026'; }
}
function hasLicenseFile(dir) { return ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].some(n => fs.existsSync(path.join(dir, n))); }

let added = [], fixed = [], proprietary = [];
for (const g of groups) {
	const gd = path.join('modules', g);
	if (!fs.existsSync(gd)) continue;
	for (const m of fs.readdirSync(gd)) {
		const dir = path.join(gd, m), key = g + '/' + m;
		const pkgPath = path.join(dir, 'package.json');
		if (!fs.existsSync(pkgPath)) continue;
		let pkg; try { pkg = require(path.resolve(pkgPath)); } catch (e) { continue; }
		const year = firstYear(dir);

		if (PROPRIETARY.has(key)) {
			// package.json MIT -> UNLICENSED (string-replace to preserve formatting)
			let raw = fs.readFileSync(pkgPath, 'utf8');
			if (/"license":\s*"MIT"/.test(raw)) { fs.writeFileSync(pkgPath, raw.replace(/"license":\s*"MIT"/, '"license": "UNLICENSED"')); }
			fs.writeFileSync(path.join(dir, 'LICENSE'), proprietaryText(year));
			proprietary.push(key + ' (' + year + ')');
			continue;
		}
		if (key === 'orator/orator-serviceserver-base') {
			let raw = fs.readFileSync(pkgPath, 'utf8');
			if (/"license":\s*"ISC"/.test(raw)) { fs.writeFileSync(pkgPath, raw.replace(/"license":\s*"ISC"/, '"license": "MIT"')); fixed.push(key + ' ISC->MIT'); }
		}
		if (pkg.license === 'MIT' && !hasLicenseFile(dir)) {
			fs.writeFileSync(path.join(dir, 'LICENSE'), mitText(year));
			added.push(key + ' (' + year + ')');
		}
	}
}
console.log('=== Added MIT LICENSE files (' + added.length + ') ===');
added.forEach(a => console.log('  ' + a));
console.log('\n=== package.json fixes (' + fixed.length + ') ===');
fixed.forEach(f => console.log('  ' + f));
console.log('\n=== Proprietary (UNLICENSED + LICENSE rewritten) (' + proprietary.length + ') ===');
proprietary.forEach(p => console.log('  ' + p));
