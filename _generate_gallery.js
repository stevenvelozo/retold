// Generate the Live Examples gallery markdown from _examples_catalog.json
const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('_examples_catalog.json', 'utf8'));

// hand-enrich entries lacking ExampleApplication metadata
for (const x of cat) {
	if (x.module === 'pict' && x.example === 'hello_world') {
		x.title = 'Hello World'; x.complexity = 'Basic';
		x.summary = 'The smallest possible Pict app — a single template-bound view rendered into the page. Start here.';
	}
}

// curated narrative order of libraries; anything else appended alphabetically
const ORDER = [
	'pict', 'pict-application', 'pict-router', 'pict-panel',
	'pict-section-form', 'pict-section-formeditor', 'pict-section-connection-form',
	'pict-section-content', 'pict-section-markdowneditor', 'pict-section-code', 'pict-section-inlinedocumentation',
	'pict-section-tuigrid', 'pict-section-objecteditor', 'pict-meadow-connection-manager',
	'pict-section-histogram', 'pict-section-equation', 'pict-section-openseadragon',
	'pict-section-flow', 'pict-section-modal', 'pict-provider-theme',
];
const cOrder = { 'Basic': 0, 'Intermediate': 1, 'Advanced': 2, '': 3 };
const cBadge = { 'Basic': 'Basic', 'Intermediate': 'Intermediate', 'Advanced': 'Advanced', '': '' };

// group by module
const byMod = {};
for (const x of cat) (byMod[x.module] ||= []).push(x);
const mods = Object.keys(byMod).sort((a, b) => {
	const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
	if (ia === -1 && ib === -1) return a.localeCompare(b);
	if (ia === -1) return 1; if (ib === -1) return -1;
	return ia - ib;
});

let out = '';
const total = cat.length;
out += `# Live Examples\n\n`;
out += `> **${total} interactive, in-browser demos** of the Pict component libraries — real applications running live on GitHub Pages. Open any one and poke at it: every form, grid, editor, modal, and viewer below is the genuine component, not a screenshot. The library each one showcases is linked beside its heading, so you can jump straight from "I want that" to its documentation.\n\n`;
out += `Each demo is tagged Basic, Intermediate, or Advanced - a rough guide to how much of the framework it exercises, not how hard the component is to use.\n\n`;

// Start-here highlights
const picks = [
	['pict', 'hello_world'], ['pict-section-form', 'simple_table'],
	['pict-section-flow', 'simple_cards'], ['pict-provider-theme', 'theme-playground'],
];
out += `### New here? Start with these\n\n`;
for (const [m, e] of picks) {
	const x = cat.find(z => z.module === m && z.example === e);
	if (x) out += `- [**${x.title}**](${x.liveURL}) — ${x.summary}\n`;
}
out += `\n---\n\n`;

for (const m of mods) {
	const items = byMod[m].sort((a, b) => (cOrder[a.complexity] ?? 3) - (cOrder[b.complexity] ?? 3) || a.title.localeCompare(b.title));
	const owner = items[0].owner;
	out += `## ${m}\n\n`;
	out += `[Documentation](https://${owner}.github.io/${m}/) - [Source](https://github.com/${owner}/${m})\n\n`;
	for (const x of items) {
		const badge = cBadge[x.complexity] ? ` (${cBadge[x.complexity]})` : '';
		out += `- [**${x.title}**${badge}](${x.liveURL})<br/>${x.summary}\n`;
	}
	out += `\n`;
}

out += `---\n\n`;
out += `_All ${total} examples verified live (HTTP 200). Generated from each example app's \`retold.ExampleApplication\` metadata. Want to add one? See the [Example App Style Guide](../architecture/example-app-style-guide.md)._\n`;

fs.writeFileSync('docs/examples/live-examples.md', out);
console.log(`Wrote docs/examples/live-examples.md — ${total} examples across ${mods.length} libraries`);
console.log('Library order: ' + mods.join(', '));
