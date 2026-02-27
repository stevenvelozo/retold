#!/usr/bin/env node
/**
 * Generates the in-ecosystem dependency graph JSON for the Retold module suite.
 * Run from the retold root directory.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('find . -maxdepth 4 -name package.json -not -path "*/node_modules/*" -not -path "*/.git/*"', { encoding: 'utf8' }).trim().split('\n');

// Collect all ecosystem package names and data
const ecosystemNames = new Set();
const moduleData = [];

for (const f of files)
{
	try
	{
		const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
		if (pkg.name)
		{
			ecosystemNames.add(pkg.name);
			const dir = path.dirname(f);
			let group = 'root';
			const parts = dir.split('/');
			const modIdx = parts.indexOf('modules');
			if (modIdx >= 0 && parts.length > modIdx + 1)
			{
				group = parts[modIdx + 1];
			}
			// Determine category
			let category = 'module';
			if (dir.includes('/examples/'))
			{
				category = 'example';
			}
			else if (dir === '.')
			{
				category = 'root';
			}
			else if (dir.includes('/source/'))
			{
				category = 'internal';
			}

			moduleData.push({
				name: pkg.name,
				dir: dir,
				group: group,
				category: category,
				version: pkg.version || '0.0.0',
				description: pkg.description || '',
				dependencies: pkg.dependencies || {},
				devDependencies: pkg.devDependencies || {}
			});
		}
	}
	catch(e) {}
}

// Build the graph
const graph = {
	metadata: {
		generated: new Date().toISOString().split('T')[0],
		description: 'In-ecosystem dependency graph for the Retold module suite',
		totalModules: moduleData.length,
		totalEcosystemPackages: ecosystemNames.size,
		groups: ['fable', 'meadow', 'orator', 'pict', 'utility', 'apps', 'root']
	},
	nodes: [],
	edges: [],
	groups: {}
};

// Build nodes and edges
for (const mod of moduleData)
{
	const prodEcoDeps = [];
	const devEcoDeps = [];

	for (const [dep, ver] of Object.entries(mod.dependencies))
	{
		if (ecosystemNames.has(dep))
		{
			prodEcoDeps.push(dep);
		}
	}
	for (const [dep, ver] of Object.entries(mod.devDependencies))
	{
		if (ecosystemNames.has(dep))
		{
			devEcoDeps.push(dep);
		}
	}

	const node = {
		name: mod.name,
		group: mod.group,
		category: mod.category,
		version: mod.version,
		description: mod.description,
		path: mod.dir,
		ecosystemProductionDependencyCount: prodEcoDeps.length,
		ecosystemDevDependencyCount: devEcoDeps.length,
		totalExternalDependencyCount: Object.keys(mod.dependencies).length - prodEcoDeps.length,
		totalExternalDevDependencyCount: Object.keys(mod.devDependencies).length - devEcoDeps.length
	};
	graph.nodes.push(node);

	// Production edges
	for (const [dep, ver] of Object.entries(mod.dependencies))
	{
		if (ecosystemNames.has(dep))
		{
			graph.edges.push({
				from: mod.name,
				to: dep,
				version: ver.replace('file:', '').replace(/\.\.\//g, ''),
				type: 'production'
			});
		}
	}
	// Development edges
	for (const [dep, ver] of Object.entries(mod.devDependencies))
	{
		if (ecosystemNames.has(dep))
		{
			graph.edges.push({
				from: mod.name,
				to: dep,
				version: ver.replace('file:', '').replace(/\.\.\//g, ''),
				type: 'development'
			});
		}
	}
}

// Group nodes
for (const node of graph.nodes)
{
	if (!graph.groups[node.group])
	{
		graph.groups[node.group] = [];
	}
	graph.groups[node.group].push(node.name);
}

// Compute graph analytics
const inDegree = {};
const outDegree = {};
for (const edge of graph.edges)
{
	outDegree[edge.from] = (outDegree[edge.from] || 0) + 1;
	inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
}

// Leaves: no outgoing ecosystem deps
const leaves = graph.nodes.filter(n => !outDegree[n.name]).map(n => n.name);
// Roots: nothing depends on them
const roots = graph.nodes.filter(n => !inDegree[n.name]).map(n => n.name);
// Most depended upon
const mostDepended = Object.entries(inDegree).sort((a,b) => b[1] - a[1]).slice(0, 20);

graph.analytics = {
	leafNodes: leaves,
	rootNodes: roots,
	mostDependedUpon: mostDepended.map(([name, count]) => ({ name, dependedUponBy: count })),
	totalProductionEdges: graph.edges.filter(e => e.type === 'production').length,
	totalDevelopmentEdges: graph.edges.filter(e => e.type === 'development').length
};

fs.writeFileSync('docs/architecture/dependencies/in-ecosystem-dependency-graph.json', JSON.stringify(graph, null, '\t'));
console.log('JSON written. Stats:');
console.log('  Nodes:', graph.nodes.length);
console.log('  Edges:', graph.edges.length);
console.log('  Production edges:', graph.analytics.totalProductionEdges);
console.log('  Development edges:', graph.analytics.totalDevelopmentEdges);
console.log('  Leaf nodes:', leaves.length);
console.log('  Root nodes:', roots.length);
console.log('');
console.log('Most depended upon:');
for (const m of mostDepended)
{
	console.log('  ', m[0], '-', m[1], 'dependents');
}
