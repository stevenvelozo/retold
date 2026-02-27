#!/usr/bin/env node
/**
 * Generates an SVG dependency graph for the Retold module suite.
 * Reads from in-ecosystem-dependency-graph.json and writes the SVG.
 *
 * Layout: 2-column grid of groups arranged to follow the architectural layering.
 *   Row 0: Fable (Core) | Utility (Build/Ops)
 *   Row 1: Meadow (Data) — full width since it has the most modules
 *   Row 2: Orator (API)  | Apps (Full Stack)
 *   Row 3: Pict (MVC/UI) — full width since it has the most modules
 *   Row 4: Root
 *
 * Production deps = solid arrows, dev deps = dashed.
 * Core nodes (>=10 dependents) are highlighted with filled backgrounds.
 */
const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('docs/architecture/dependencies/in-ecosystem-dependency-graph.json', 'utf8'));

// Filter to only module-category and root-category nodes (exclude examples, internal)
const includedCategories = new Set(['module', 'root']);
const includedNodes = graph.nodes.filter(n => includedCategories.has(n.category));
const includedNames = new Set(includedNodes.map(n => n.name));

// Filter edges to only included nodes
const edges = graph.edges.filter(e => includedNames.has(e.from) && includedNames.has(e.to));

// Precompute in-degree for each node
const inDegreeMap = {};
for (const e of edges)
{
	inDegreeMap[e.to] = (inDegreeMap[e.to] || 0) + 1;
}

// Group configuration
const groupConfig = {
	fable:   { label: 'Fable (Core)',         color: '#4A90D9', fill: '#EBF2FA' },
	meadow:  { label: 'Meadow (Data)',        color: '#27AE60', fill: '#E8F8EF' },
	orator:  { label: 'Orator (API)',         color: '#E67E22', fill: '#FDF2E9' },
	pict:    { label: 'Pict (MVC/UI)',        color: '#8E44AD', fill: '#F4ECF7' },
	utility: { label: 'Utility (Build/Ops)',  color: '#2C3E50', fill: '#EBEDEF' },
	apps:    { label: 'Apps (Full Stack)',    color: '#C0392B', fill: '#FDEDEC' },
	root:    { label: 'Root / Examples',      color: '#7F8C8D', fill: '#F2F3F4' }
};

// Organize nodes by group
const nodesByGroup = {};
for (const node of includedNodes)
{
	const g = node.group;
	if (!nodesByGroup[g])
	{
		nodesByGroup[g] = [];
	}
	nodesByGroup[g].push(node);
}

// Sort nodes within groups alphabetically
for (const g of Object.keys(nodesByGroup))
{
	nodesByGroup[g].sort((a, b) => a.name.localeCompare(b.name));
}

// Layout parameters
const NODE_W = 195;
const NODE_H = 26;
const NODE_PAD_X = 10;
const NODE_PAD_Y = 6;
const GROUP_PAD = 14;
const GROUP_HEADER = 32;
const GROUP_GAP_X = 24;
const GROUP_GAP_Y = 24;
const LEFT_MARGIN = 30;
const TOP_MARGIN = 72;

// Define the grid layout: rows of group placements
// Each placement: { group, col, colSpan }
// 2-column grid
const layout = [
	[{ group: 'fable', col: 0, colSpan: 1 }, { group: 'utility', col: 1, colSpan: 1 }],
	[{ group: 'meadow', col: 0, colSpan: 2 }],
	[{ group: 'orator', col: 0, colSpan: 1 }, { group: 'apps', col: 1, colSpan: 1 }],
	[{ group: 'pict', col: 0, colSpan: 2 }],
	[{ group: 'root', col: 0, colSpan: 2 }]
];

// Compute column widths
// Each group in a single column gets 3 node columns
// Full-span groups get 6 node columns
const SINGLE_COL_NODES = 3;
const FULL_COL_NODES = 6;
const singleColW = SINGLE_COL_NODES * (NODE_W + NODE_PAD_X) + GROUP_PAD * 2 - NODE_PAD_X;
const fullColW = FULL_COL_NODES * (NODE_W + NODE_PAD_X) + GROUP_PAD * 2 - NODE_PAD_X;

const SVG_W = LEFT_MARGIN * 2 + fullColW;

// Position nodes
const nodePositions = {};
const groupBounds = {};
let currentY = TOP_MARGIN;

for (const row of layout)
{
	let maxRowH = 0;

	for (const placement of row)
	{
		const grp = placement.group;
		const nodes = nodesByGroup[grp] || [];
		if (nodes.length === 0) continue;

		const isFullSpan = placement.colSpan === 2;
		const nodeCols = isFullSpan ? FULL_COL_NODES : SINGLE_COL_NODES;
		const groupW = isFullSpan ? fullColW : singleColW;
		const groupX = LEFT_MARGIN + placement.col * (singleColW + GROUP_GAP_X);

		const nodeRows = Math.ceil(nodes.length / nodeCols);
		const groupH = GROUP_HEADER + nodeRows * (NODE_H + NODE_PAD_Y) + GROUP_PAD;

		groupBounds[grp] = { x: groupX, y: currentY, w: groupW, h: groupH };

		for (let i = 0; i < nodes.length; i++)
		{
			const col = i % nodeCols;
			const row = Math.floor(i / nodeCols);
			const x = groupX + GROUP_PAD + col * (NODE_W + NODE_PAD_X);
			const y = currentY + GROUP_HEADER + row * (NODE_H + NODE_PAD_Y);
			nodePositions[nodes[i].name] = {
				x: x,
				y: y,
				cx: x + NODE_W / 2,
				cy: y + NODE_H / 2,
				right: x + NODE_W,
				bottom: y + NODE_H,
				group: grp,
				node: nodes[i]
			};
		}

		if (groupH > maxRowH) maxRowH = groupH;
	}

	currentY += maxRowH + GROUP_GAP_Y;
}

const SVG_H = currentY + 30;

// Build SVG
let svg = '';

function esc(s)
{
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function round(n)
{
	return Math.round(n * 10) / 10;
}

// Header
svg += `<?xml version="1.0" encoding="UTF-8"?>\n`;
svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}" font-family="'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace">\n`;

// Style
svg += `<style>\n`;
svg += `  .node-box { transition: opacity 0.2s; }\n`;
svg += `  .edge-line { transition: opacity 0.2s; }\n`;
svg += `</style>\n`;

// Defs
svg += `<defs>\n`;
svg += `  <marker id="arrowProd" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto" markerUnits="strokeWidth">\n`;
svg += `    <path d="M0,0 L7,2.5 L0,5" fill="#666" />\n`;
svg += `  </marker>\n`;
svg += `  <marker id="arrowDev" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto" markerUnits="strokeWidth">\n`;
svg += `    <path d="M0,0 L7,2.5 L0,5" fill="#BBB" />\n`;
svg += `  </marker>\n`;
svg += `</defs>\n`;

// Background
svg += `<rect width="100%" height="100%" fill="#FAFBFC" />\n`;

// Title
svg += `<text x="${SVG_W / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#2C3E50">Retold In-Ecosystem Dependency Graph</text>\n`;
const prodCount = edges.filter(e => e.type === 'production').length;
const devCount = edges.filter(e => e.type === 'development').length;
svg += `<text x="${SVG_W / 2}" y="46" text-anchor="middle" font-size="10" fill="#7F8C8D">${includedNodes.length} modules | ${prodCount} production deps | ${devCount} dev deps | Generated ${graph.metadata.generated}</text>\n`;

// Legend
svg += `<g transform="translate(${SVG_W - 310}, 14)">\n`;
svg += `  <line x1="0" y1="0" x2="24" y2="0" stroke="#555" stroke-width="1.5" marker-end="url(#arrowProd)" />\n`;
svg += `  <text x="30" y="4" font-size="9" fill="#555">Production dep</text>\n`;
svg += `  <line x1="120" y1="0" x2="144" y2="0" stroke="#BBB" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrowDev)" />\n`;
svg += `  <text x="150" y="4" font-size="9" fill="#555">Dev dep</text>\n`;
svg += `  <rect x="0" y="12" width="12" height="12" rx="2" fill="#8E44AD" stroke="#8E44AD" />\n`;
svg += `  <text x="18" y="22" font-size="9" fill="#555">Core module (10+ dependents)</text>\n`;
svg += `</g>\n`;

// Draw edges (behind nodes)
svg += `<g id="edges">\n`;

const prodEdges = edges.filter(e => e.type === 'production');
const devEdges = edges.filter(e => e.type === 'development');

function drawEdge(edge, isProd)
{
	const from = nodePositions[edge.from];
	const to = nodePositions[edge.to];
	if (!from || !to) return '';

	let x1, y1, x2, y2;

	// Determine connection points based on relative positions
	const fromGB = groupBounds[from.group];
	const toGB = groupBounds[to.group];
	const sameGroup = from.group === to.group;

	if (sameGroup)
	{
		// Same group: connect right side to left side
		x1 = from.right;
		y1 = from.cy;
		x2 = to.x;
		y2 = to.cy;
		// If target is to the left, connect from left to right
		if (to.x <= from.x)
		{
			x1 = from.x;
			x2 = to.right;
		}
	}
	else
	{
		// Different groups
		const fromCenterY = fromGB.y + fromGB.h / 2;
		const toCenterY = toGB.y + toGB.h / 2;
		const fromCenterX = fromGB.x + fromGB.w / 2;
		const toCenterX = toGB.x + toGB.w / 2;

		if (Math.abs(fromGB.y - toGB.y) < 10)
		{
			// Groups on same row: connect left/right
			if (fromCenterX < toCenterX)
			{
				x1 = from.right;
				y1 = from.cy;
				x2 = to.x;
				y2 = to.cy;
			}
			else
			{
				x1 = from.x;
				y1 = from.cy;
				x2 = to.right;
				y2 = to.cy;
			}
		}
		else if (fromCenterY < toCenterY)
		{
			// Source above target: connect bottom to top
			x1 = from.cx;
			y1 = from.bottom;
			x2 = to.cx;
			y2 = to.y;
		}
		else
		{
			// Target above source: connect top to bottom
			x1 = from.cx;
			y1 = from.y;
			x2 = to.cx;
			y2 = to.bottom;
		}
	}

	const dx = x2 - x1;
	const dy = y2 - y1;

	// Use cubic bezier with gentle curves
	let path;
	if (Math.abs(dy) > Math.abs(dx))
	{
		// Vertical-dominant: curve via vertical control points
		const cy1 = y1 + dy * 0.4;
		const cy2 = y2 - dy * 0.4;
		path = `M${round(x1)},${round(y1)} C${round(x1)},${round(cy1)} ${round(x2)},${round(cy2)} ${round(x2)},${round(y2)}`;
	}
	else
	{
		// Horizontal-dominant: curve via horizontal control points
		const cx1 = x1 + dx * 0.4;
		const cx2 = x2 - dx * 0.4;
		path = `M${round(x1)},${round(y1)} C${round(cx1)},${round(y1)} ${round(cx2)},${round(y2)} ${round(x2)},${round(y2)}`;
	}

	const stroke = isProd ? '#555' : '#CCC';
	const width = isProd ? '1' : '0.7';
	const dash = isProd ? '' : ' stroke-dasharray="4,3"';
	const marker = isProd ? 'url(#arrowProd)' : 'url(#arrowDev)';
	const opacity = isProd ? '0.3' : '0.15';

	return `  <path class="edge-line" d="${path}" fill="none" stroke="${stroke}" stroke-width="${width}"${dash} marker-end="${marker}" opacity="${opacity}" />\n`;
}

for (const e of devEdges)
{
	svg += drawEdge(e, false);
}
for (const e of prodEdges)
{
	svg += drawEdge(e, true);
}
svg += `</g>\n`;

// Draw group backgrounds
for (const grp of Object.keys(groupBounds))
{
	const b = groupBounds[grp];
	const cfg = groupConfig[grp] || { label: grp, color: '#999', fill: '#F5F5F5' };
	const count = (nodesByGroup[grp] || []).length;

	svg += `<g id="group-${grp}">\n`;
	svg += `  <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${cfg.fill}" stroke="${cfg.color}" stroke-width="1.5" opacity="0.85" />\n`;
	svg += `  <text x="${b.x + 12}" y="${b.y + 20}" font-size="12" font-weight="bold" fill="${cfg.color}">${esc(cfg.label)}</text>\n`;
	svg += `  <text x="${b.x + b.w - 12}" y="${b.y + 20}" text-anchor="end" font-size="9" fill="${cfg.color}" opacity="0.7">${count} modules</text>\n`;
	svg += `</g>\n`;
}

// Draw nodes
svg += `<g id="nodes">\n`;
for (const [name, pos] of Object.entries(nodePositions))
{
	const cfg = groupConfig[pos.group] || { color: '#999' };
	const inDeg = inDegreeMap[name] || 0;

	// Highlight core modules (>=10 dependents)
	const isCore = inDeg >= 10;
	const fillColor = isCore ? cfg.color : '#FFFFFF';
	const textColor = isCore ? '#FFFFFF' : '#2C3E50';
	const strokeW = isCore ? '2' : '1';

	// Truncate long names for display
	let displayName = name;
	if (displayName.length > 26)
	{
		displayName = displayName.substring(0, 24) + '..';
	}

	svg += `  <g class="node-box">\n`;
	svg += `    <rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="4" fill="${fillColor}" stroke="${cfg.color}" stroke-width="${strokeW}" />\n`;
	svg += `    <text x="${pos.x + 6}" y="${pos.y + 17}" font-size="9" fill="${textColor}">${esc(displayName)}</text>\n`;
	if (inDeg > 0)
	{
		svg += `    <text x="${pos.x + NODE_W - 6}" y="${pos.y + 17}" text-anchor="end" font-size="7" fill="${isCore ? 'rgba(255,255,255,0.8)' : '#AAA'}">${inDeg}</text>\n`;
	}
	svg += `  </g>\n`;
}
svg += `</g>\n`;

svg += `</svg>\n`;

fs.writeFileSync('docs/architecture/dependencies/in-ecosystem-dependency-graph.svg', svg);
console.log('SVG written:', Math.round(svg.length / 1024), 'KB');
console.log('Dimensions:', SVG_W, 'x', SVG_H);
