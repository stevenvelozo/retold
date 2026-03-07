#!/usr/bin/env node
/**
 * Generates a Mermaid dependency graph for the Retold module suite.
 * Reads from in-ecosystem-dependency-graph.json and writes a mermaid code block
 * that can be embedded directly in the markdown file.
 *
 * Usage: node _generate-mermaid.js
 *   Outputs the mermaid block to stdout and writes it to _mermaid-block.md
 *
 * Production deps = solid arrows, dev deps = dotted arrows.
 * Core nodes (>=10 dependents) get bold styling.
 */
const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('docs/architecture/dependencies/in-ecosystem-dependency-graph.json', 'utf8'));

// Filter to only module-category and root-category nodes (exclude examples, internal)
const includedCategories = new Set(['module', 'root']);
const includedNodes = graph.nodes.filter(n => includedCategories.has(n.category));
const includedNames = new Set(includedNodes.map(n => n.name));

// Filter edges to only included nodes
const edges = graph.edges.filter(e => includedNames.has(e.from) && includedNames.has(e.to));

// Precompute in-degree for each node (production edges only for "core" designation)
const inDegreeMap = {};
for (const tmpEdge of edges)
{
	inDegreeMap[tmpEdge.to] = (inDegreeMap[tmpEdge.to] || 0) + 1;
}

// Group configuration matching the architectural layers
const groupConfig =
{
	fable:   { label: 'Fable — Core Ecosystem',  order: 0 },
	utility: { label: 'Utility — Build & Ops',   order: 1 },
	meadow:  { label: 'Meadow — Data Access',    order: 2 },
	orator:  { label: 'Orator — API Server',     order: 3 },
	apps:    { label: 'Apps — Full Stack',        order: 4 },
	pict:    { label: 'Pict — MVC & UI',         order: 5 },
	root:    { label: 'Root — Meta & Examples',   order: 6 }
};

// Organize nodes by group
const nodesByGroup = {};
for (const tmpNode of includedNodes)
{
	const tmpGroup = tmpNode.group;
	if (!nodesByGroup[tmpGroup])
	{
		nodesByGroup[tmpGroup] = [];
	}
	nodesByGroup[tmpGroup].push(tmpNode);
}

// Sort nodes within groups alphabetically
for (const tmpGroup of Object.keys(nodesByGroup))
{
	nodesByGroup[tmpGroup].sort((a, b) => a.name.localeCompare(b.name));
}

// Convert module name to a valid mermaid node ID
// Prefix with n_ to avoid collision with subgraph IDs (e.g. fable group vs fable module)
function toId(pName)
{
	return 'n_' + pName.replace(/-/g, '_');
}

// Build the mermaid diagram
let tmpMermaid = '';
tmpMermaid += 'flowchart TD\n';

// Sort groups by configured order
const tmpSortedGroups = Object.keys(nodesByGroup).sort((a, b) =>
{
	return (groupConfig[a] ? groupConfig[a].order : 99) - (groupConfig[b] ? groupConfig[b].order : 99);
});

// Track emitted nodes to avoid duplicates
const tmpEmittedNodes = new Set();

// Emit subgraphs with nodes
for (const tmpGroup of tmpSortedGroups)
{
	const tmpNodes = nodesByGroup[tmpGroup];
	if (!tmpNodes || tmpNodes.length === 0) continue;

	const tmpLabel = groupConfig[tmpGroup] ? groupConfig[tmpGroup].label : tmpGroup;
	tmpMermaid += '\n';
	tmpMermaid += '\tsubgraph sg_' + tmpGroup + '["' + tmpLabel + '"]\n';

	for (const tmpNode of tmpNodes)
	{
		const tmpId = toId(tmpNode.name);
		if (tmpEmittedNodes.has(tmpId)) continue;
		tmpEmittedNodes.add(tmpId);

		const tmpInDeg = inDegreeMap[tmpNode.name] || 0;
		const tmpIsCore = tmpInDeg >= 10;

		// Core modules get stadium shape ([...]), others get rounded brackets
		if (tmpIsCore)
		{
			tmpMermaid += '\t\t' + tmpId + '([' + tmpNode.name + ' (' + tmpInDeg + ')' + '])\n';
		}
		else if (tmpInDeg > 0)
		{
			tmpMermaid += '\t\t' + tmpId + '[' + tmpNode.name + ' (' + tmpInDeg + ')' + ']\n';
		}
		else
		{
			tmpMermaid += '\t\t' + tmpId + '[' + tmpNode.name + ']\n';
		}
	}

	tmpMermaid += '\tend\n';
}

tmpMermaid += '\n';

// Deduplicate edges
const tmpEdgeSet = new Set();

// Emit production edges (solid arrows)
const tmpProdEdges = edges.filter(e => e.type === 'production');
const tmpDevEdges = edges.filter(e => e.type === 'development');

tmpMermaid += '\t%% Production dependencies (solid arrows)\n';
for (const tmpEdge of tmpProdEdges)
{
	const tmpKey = toId(tmpEdge.from) + ' --> ' + toId(tmpEdge.to);
	if (tmpEdgeSet.has(tmpKey)) continue;
	tmpEdgeSet.add(tmpKey);
	tmpMermaid += '\t' + tmpKey + '\n';
}

tmpMermaid += '\n';
tmpMermaid += '\t%% Development dependencies (dotted arrows)\n';
for (const tmpEdge of tmpDevEdges)
{
	const tmpKey = toId(tmpEdge.from) + ' -.-> ' + toId(tmpEdge.to);
	if (tmpEdgeSet.has(tmpKey)) continue;
	tmpEdgeSet.add(tmpKey);
	tmpMermaid += '\t' + tmpKey + '\n';
}

tmpMermaid += '\n';

// Style classes for groups
tmpMermaid += '\t%% Group styling\n';
tmpMermaid += '\tstyle sg_fable fill:#EBF2FA,stroke:#4A90D9,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_utility fill:#EBEDEF,stroke:#2C3E50,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_meadow fill:#E8F8EF,stroke:#27AE60,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_orator fill:#FDF2E9,stroke:#E67E22,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_apps fill:#FDEDEC,stroke:#C0392B,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_pict fill:#F4ECF7,stroke:#8E44AD,stroke-width:2px\n';
tmpMermaid += '\tstyle sg_root fill:#F2F3F4,stroke:#7F8C8D,stroke-width:2px\n';

// Output
const tmpOutput = '```mermaid\n' + tmpMermaid + '```\n';

// Write to stdout for embedding in the markdown file
process.stdout.write(tmpOutput);
console.error('Stats:');
console.error('  Nodes:', includedNodes.length);
console.error('  Production edges:', tmpProdEdges.length);
console.error('  Development edges:', tmpDevEdges.length);
