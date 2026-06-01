// Generate the Live Examples gallery (single markdown table) from _examples_catalog.json
const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('_examples_catalog.json', 'utf8'));

for (const x of cat) {
	if (x.module === 'pict' && x.example === 'hello_world') {
		x.title = 'Hello World'; x.complexity = 'Basic';
		x.summary = 'The smallest possible Pict app: a single template-bound view rendered into the page. Start here.';
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
// markdown table cell sanitiser: strip em/en dashes + ellipsis, escape pipes, collapse newlines
const cell = (s) => String(s || '').replace(/[—–]/g, '-').replace(/…/g, '...').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();

cat.sort((a, b) => {
	const ia = ORDER.indexOf(a.module), ib = ORDER.indexOf(b.module);
	const oa = ia === -1 ? 999 : ia, ob = ib === -1 ? 999 : ib;
	if (oa !== ob) return oa - ob;
	if (a.module !== b.module) return a.module.localeCompare(b.module);
	return (cOrder[a.complexity] ?? 3) - (cOrder[b.complexity] ?? 3);
});

let out = '';
out += `# Live Examples\n\n`;
out += `> **${cat.length} interactive, in-browser demos** of the Pict component libraries - real applications running live on GitHub Pages, not screenshots. Open any one and poke at it. The library each demonstrates links to its full documentation.\n\n`;
out += `New to Pict? Start with [Hello World](https://fable-retold.github.io/pict/examples/hello_world/dist/), [Simple Table](https://fable-retold.github.io/pict-section-form/examples/simple_table/), or the [Theme Playground](https://fable-retold.github.io/pict-provider-theme/examples/theme-playground/). Level is a rough guide to how much of the framework a demo exercises, not how hard the component is to use.\n\n`;
out += `| Example | Level | What it shows | Library |\n`;
out += `|---|---|---|---|\n`;
for (const x of cat) {
	const owner = x.owner;
	out += `| [${cell(x.title)}](${x.liveURL}) | ${x.complexity || '-'} | ${cell(x.summary)} | [${x.module}](https://${owner}.github.io/${x.module}/) |\n`;
}
out += `\n---\n\n`;
out += `_${cat.length} examples, all verified live. Want to add one? See the [Example App Style Guide](../architecture/example-app-style-guide.md)._\n`;

fs.writeFileSync('docs/examples/live-examples.md', out);
console.log(`Wrote docs/examples/live-examples.md as a ${cat.length}-row table`);
