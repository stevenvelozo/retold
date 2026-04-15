/**
 * Retold Manager -- Ripple Graph + Plan Builder
 *
 * Walks every ecosystem module's package.json to build a dependency graph:
 *   edges: consumer --depends-on--> producer
 *
 * From any Root module, computes the transitive consumer closure and
 * produces an ordered "ripple plan" — the sequence of work needed to
 * propagate a new version of Root through every module that depends on
 * it. Order is producers-before-consumers via Kahn's topological sort,
 * with ties broken by group order (fable → meadow → orator → pict →
 * utility → apps) for determinism.
 *
 * Plan shape:
 *   {
 *     PlanId, Root, TargetVersion, GeneratedAt,
 *     Graph: { Nodes:[{Name,Group}], Edges:[{From,To,Section,Range}] },
 *     Steps: [
 *       // first step is the root producer
 *       { Order:0, Module:'fable-log', Kind:'producer',
 *         Actions:[{ Op:'publish' }] },
 *       // then each consumer
 *       { Order:1, Module:'fable', Kind:'consumer',
 *         Actions:[
 *           { Op:'update-dep', Dep:'fable-log', Range:'^3.0.19', Section:'dependencies' },
 *           { Op:'install' },
 *           { Op:'commit', Message:'bump fable-log@^3.0.19' },
 *           { Op:'bump',   Kind:'patch' },
 *           { Op:'publish' }
 *         ] }
 *     ]
 *   }
 */

const libPath = require('path');
const libFs = require('fs');

const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];

function groupRank(pGroupName)
{
	let tmpIndex = GROUP_ORDER.indexOf(pGroupName);
	return tmpIndex === -1 ? GROUP_ORDER.length : tmpIndex;
}

class RippleGraph
{
	/**
	 * @param {object} pOptions
	 * @param {object} pOptions.manifest  Manager-Core-ModuleCatalog (manifest-backed)
	 * @param {object} [pOptions.log]
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.manifest = tmpOptions.manifest;
		this.log = tmpOptions.log || null;

		if (!this.manifest)
		{
			throw new Error('RippleGraph requires { manifest } (ModuleCatalog instance)');
		}

		this._cache = null;
	}

	/**
	 * Build (or return cached) graph. Each call to invalidate() forces a rebuild.
	 * @returns {{ Nodes: Map<string, {Name,Group}>, Edges: Array<{From,To,Section,Range}>,
	 *            ConsumersOf: Map<string, Array<{From,Section,Range}>>,
	 *            DependenciesOf: Map<string, Array<{To,Section,Range}>> }}
	 */
	build()
	{
		if (this._cache) { return this._cache; }

		let tmpManifest = this.manifest.manifest; // ManifestLoader
		let tmpEcosystem = tmpManifest.ecosystemNames instanceof Set
			? tmpManifest.ecosystemNames
			: new Set(tmpManifest.getAllModuleNames());

		let tmpNodes = new Map();
		let tmpEdges = [];
		let tmpConsumersOf = new Map();
		let tmpDependenciesOf = new Map();

		let tmpAll = this.manifest.getAllModules();
		for (let i = 0; i < tmpAll.length; i++)
		{
			let tmpEntry = tmpAll[i];
			tmpNodes.set(tmpEntry.Name, { Name: tmpEntry.Name, Group: tmpEntry.GroupName });

			let tmpPkg = this._readPackageJson(tmpEntry.AbsolutePath);
			if (!tmpPkg) { continue; }

			// deps + devDeps
			this._collectEdges(tmpPkg.dependencies || {}, tmpEntry.Name, 'dependencies',
				tmpEcosystem, tmpEdges, tmpConsumersOf, tmpDependenciesOf);
			this._collectEdges(tmpPkg.devDependencies || {}, tmpEntry.Name, 'devDependencies',
				tmpEcosystem, tmpEdges, tmpConsumersOf, tmpDependenciesOf);
		}

		this._cache =
			{
				Nodes: tmpNodes,
				Edges: tmpEdges,
				ConsumersOf: tmpConsumersOf,
				DependenciesOf: tmpDependenciesOf,
			};
		return this._cache;
	}

	invalidate()
	{
		this._cache = null;
	}

	_readPackageJson(pAbsolutePath)
	{
		try
		{
			let tmpContent = libFs.readFileSync(libPath.join(pAbsolutePath, 'package.json'), 'utf8');
			return JSON.parse(tmpContent);
		}
		catch (pError)
		{
			return null;
		}
	}

	_collectEdges(pDeps, pConsumerName, pSection, pEcosystem, pEdges, pConsumersOf, pDepsOf)
	{
		let tmpKeys = Object.keys(pDeps);
		for (let i = 0; i < tmpKeys.length; i++)
		{
			let tmpProducer = tmpKeys[i];
			if (!pEcosystem.has(tmpProducer)) { continue; }
			let tmpRange = pDeps[tmpProducer];

			let tmpEdge =
				{
					From: pConsumerName,
					To: tmpProducer,
					Section: pSection,
					Range: tmpRange,
					LocalLink: (typeof tmpRange === 'string' && tmpRange.startsWith('file:')),
				};
			pEdges.push(tmpEdge);

			if (!pConsumersOf.has(tmpProducer)) { pConsumersOf.set(tmpProducer, []); }
			pConsumersOf.get(tmpProducer).push({ From: pConsumerName, Section: pSection, Range: tmpRange, LocalLink: tmpEdge.LocalLink });

			if (!pDepsOf.has(pConsumerName)) { pDepsOf.set(pConsumerName, []); }
			pDepsOf.get(pConsumerName).push({ To: tmpProducer, Section: pSection, Range: tmpRange, LocalLink: tmpEdge.LocalLink });
		}
	}

	/**
	 * Transitive consumers of pRoot via BFS. Excludes file:-linked edges
	 * because those are dev workspaces, not version-propagating dependencies.
	 *
	 * @returns {string[]} module names, not including pRoot
	 */
	getTransitiveConsumers(pRoot, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpIncludeDev = (tmpOptions.IncludeDev !== false);
		let tmpStopAtApps = !!tmpOptions.StopAtApps;

		let tmpGraph = this.build();
		let tmpVisited = new Set();
		// Pre-mark the root so any back-edge through a dep cycle (e.g., fable-log
		// → pict-section-content for docs, and pict-section-content's own
		// transitive consumers loop back to fable-log) doesn't re-add the root
		// to the result and break the topological order downstream.
		tmpVisited.add(pRoot);
		let tmpQueue = [pRoot];
		let tmpResult = [];

		while (tmpQueue.length > 0)
		{
			let tmpCurrent = tmpQueue.shift();
			let tmpConsumers = tmpGraph.ConsumersOf.get(tmpCurrent) || [];
			for (let i = 0; i < tmpConsumers.length; i++)
			{
				let tmpEdge = tmpConsumers[i];
				if (tmpEdge.LocalLink) { continue; }
				if (!tmpIncludeDev && tmpEdge.Section === 'devDependencies') { continue; }
				if (tmpVisited.has(tmpEdge.From)) { continue; }
				tmpVisited.add(tmpEdge.From);

				let tmpNode = tmpGraph.Nodes.get(tmpEdge.From);
				if (tmpStopAtApps && tmpNode && tmpNode.Group === 'Apps') { continue; }

				tmpResult.push(tmpEdge.From);
				tmpQueue.push(tmpEdge.From);
			}
		}

		return tmpResult;
	}

	/**
	 * Topologically sort a subset of module names (Kahn's). Ties broken by
	 * group order (Fable < Meadow < ... < Apps) then by name.
	 *
	 * @param {string[]} pNodes - names to include
	 * @param {object} [pOptions]
	 * @param {boolean} [pOptions.IncludeDevSections=true] When false, devDependencies
	 *   edges are ignored when computing in-degrees and during release-cascade.
	 * @returns {string[]} sorted producers-before-consumers
	 */
	topoSort(pNodes, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpIncludeDev = (tmpOptions.IncludeDevSections !== false);

		let tmpGraph = this.build();
		let tmpSet = new Set(pNodes);

		let fEdgeAllowed = function (pEdge)
			{
				if (pEdge.LocalLink) { return false; }
				if (!tmpIncludeDev && pEdge.Section === 'devDependencies') { return false; }
				return true;
			};

		// Compute in-degrees within the subset
		let tmpInDegree = new Map();
		for (let tmpName of tmpSet) { tmpInDegree.set(tmpName, 0); }
		for (let tmpName of tmpSet)
		{
			let tmpDeps = tmpGraph.DependenciesOf.get(tmpName) || [];
			for (let i = 0; i < tmpDeps.length; i++)
			{
				let tmpDep = tmpDeps[i];
				if (!fEdgeAllowed(tmpDep)) { continue; }
				if (!tmpSet.has(tmpDep.To)) { continue; }
				tmpInDegree.set(tmpName, tmpInDegree.get(tmpName) + 1);
			}
		}

		// Ready queue — sorted by group rank then name for determinism
		let tmpReady = [];
		for (let [tmpName, tmpDegree] of tmpInDegree)
		{
			if (tmpDegree === 0) { tmpReady.push(tmpName); }
		}

		let tmpCompare = (pA, pB) =>
			{
				let tmpGa = groupRank(tmpGraph.Nodes.get(pA).Group);
				let tmpGb = groupRank(tmpGraph.Nodes.get(pB).Group);
				if (tmpGa !== tmpGb) { return tmpGa - tmpGb; }
				return pA.localeCompare(pB);
			};
		tmpReady.sort(tmpCompare);

		let tmpOrdered = [];
		while (tmpReady.length > 0)
		{
			let tmpNext = tmpReady.shift();
			tmpOrdered.push(tmpNext);

			// Reduce in-degree for every node that depends on tmpNext
			let tmpConsumers = tmpGraph.ConsumersOf.get(tmpNext) || [];
			let tmpReleased = [];
			for (let i = 0; i < tmpConsumers.length; i++)
			{
				let tmpEdge = tmpConsumers[i];
				if (!fEdgeAllowed(tmpEdge)) { continue; }
				if (!tmpSet.has(tmpEdge.From)) { continue; }
				let tmpNew = tmpInDegree.get(tmpEdge.From) - 1;
				tmpInDegree.set(tmpEdge.From, tmpNew);
				if (tmpNew === 0) { tmpReleased.push(tmpEdge.From); }
			}
			if (tmpReleased.length > 0)
			{
				tmpReady.push.apply(tmpReady, tmpReleased);
				tmpReady.sort(tmpCompare);
			}
		}

		// If there's a cycle in the consumer subgraph, some nodes will still
		// have non-zero in-degree. Append them in deterministic order so the
		// plan is never silently empty — the user will see them at the tail
		// of the timeline and can edit/skip if needed.
		if (tmpOrdered.length < pNodes.length)
		{
			let tmpRemaining = [];
			for (let [tmpName, tmpDegree] of tmpInDegree)
			{
				if (tmpDegree > 0) { tmpRemaining.push(tmpName); }
			}
			tmpRemaining.sort(tmpCompare);
			if (this.log)
			{
				this.log.warn('RippleGraph: cycle detected, appending '
					+ tmpRemaining.length + ' node(s) in fallback order: '
					+ tmpRemaining.join(', '));
			}
			tmpOrdered = tmpOrdered.concat(tmpRemaining);
		}

		return tmpOrdered;
	}

	/**
	 * Build a full ripple plan rooted at pRoot.
	 *
	 * @param {object} pOptions
	 * @param {string} pOptions.Root         Root module name
	 * @param {string} pOptions.TargetVersion  The version the root will be published as
	 *                                         (client picks based on package.json inspection)
	 * @param {string} [pOptions.RangePrefix='^'] Range prefix for consumers
	 * @param {string} [pOptions.ConsumerBumpKind='patch'] patch|minor|major
	 * @param {boolean} [pOptions.IncludeDev=false]  devDep consumers reliably
	 *   introduce cycles (test harnesses) so defaulted OFF.
	 * @param {boolean} [pOptions.StopAtApps=false]
	 * @param {boolean} [pOptions.RunInstall=true]
	 * @param {boolean} [pOptions.RunTest=false]
	 * @param {boolean} [pOptions.BringRetoldDepsForward=false] When true, each
	 *   consumer step begins with an `ncu-retold` action: `npx npm-check-updates
	 *   -u --filter <ecosystem>`. This pulls forward *every* retold dep on the
	 *   consumer, not just the ones in the ripple's dep cone. The subsequent
	 *   update-dep actions still run and use on-disk authoritative versions
	 *   for deps in the cone, so ncu and update-dep compose cleanly.
	 * @returns {object} plan
	 */
	buildPlan(pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpRoot = tmpOptions.Root;
		if (!tmpRoot) { throw new Error('buildPlan requires Root'); }

		let tmpTargetVersion = tmpOptions.TargetVersion;
		if (!tmpTargetVersion)
		{
			throw new Error('buildPlan requires TargetVersion — the version Root will be published as');
		}
		let tmpRangePrefix = tmpOptions.RangePrefix !== undefined ? tmpOptions.RangePrefix : '^';
		let tmpNewRange = tmpRangePrefix + tmpTargetVersion;
		let tmpConsumerBumpKind = tmpOptions.ConsumerBumpKind || 'patch';
		// IncludeDev defaults to false — devDep cycles (test harnesses)
		// reliably trip the topo fallback, so opt-in only.
		let tmpIncludeDev = (tmpOptions.IncludeDev === true);
		// StopAtApps, RunInstall, RunTest all default to TRUE (Steven's
		// preferred workflow — stay out of retold-remote/retold-databeacon
		// on a typical ripple, refresh lockfiles, and run tests before each
		// consumer publish).
		let tmpStopAtApps = (tmpOptions.StopAtApps !== false);
		let tmpRunInstall = (tmpOptions.RunInstall !== false);
		let tmpRunTest = (tmpOptions.RunTest !== false);
		let tmpRunPush = (tmpOptions.RunPush !== false);
		let tmpBringForward = !!tmpOptions.BringRetoldDepsForward;

		let tmpGraph = this.build();
		if (!tmpGraph.Nodes.has(tmpRoot))
		{
			throw new Error('Root "' + tmpRoot + '" is not in the ecosystem.');
		}

		let tmpTransitive = this.getTransitiveConsumers(tmpRoot,
			{
				IncludeDev: tmpIncludeDev,
				StopAtApps: tmpStopAtApps,
			});
		// Sort CONSUMERS only — root is always step 0 (we're publishing it
		// first, after which the consumers can update their range and
		// propagate). Including the root in the topo set means any back-edge
		// (e.g., the fable-log → pict-section-content doc cycle) creates a
		// cycle that breaks Kahn's.
		let tmpConsumerOrder = this.topoSort(tmpTransitive,
			{
				IncludeDevSections: tmpIncludeDev,
			});

		// Build steps
		let tmpSteps = [];
		let tmpCommitMessageTemplate = 'bump ' + tmpRoot + '@' + tmpNewRange;

		// Step 0: producer. Preflight ensures the root's tree is clean before
		// publishing; commit-final sweeps up any artifacts the publish process
		// regenerated (built bundles, package-lock churn); push sends the new
		// commits (and any prior local-only ones) to origin so the module
		// stops being "dirty" in the sidebar scan.
		let tmpProducerActions = [
			{ Op: 'preflight-clean-tree' },
			{ Op: 'publish' },
			{ Op: 'commit-final', MessageTemplate: 'NPM Version Bump and publish to <version>' },
		];
		if (tmpRunPush) { tmpProducerActions.push({ Op: 'push' }); }
		tmpSteps.push(
			{
				Order: 0,
				Module: tmpRoot,
				Group: tmpGraph.Nodes.get(tmpRoot).Group,
				Kind: 'producer',
				Actions: tmpProducerActions,
			});

		// Subsequent steps: consumers in topo order. Each consumer needs to
		// update every in-subset dep that is being republished (the root, plus
		// any earlier consumer step). The actual range is resolved at runtime
		// by the executor, reading the dep's current package.json — so the
		// cascading new versions propagate correctly through the chain.
		let tmpEarlierSet = new Set([tmpRoot]);
		for (let i = 0; i < tmpConsumerOrder.length; i++)
		{
			let tmpName = tmpConsumerOrder[i];

			let tmpDeps = tmpGraph.DependenciesOf.get(tmpName) || [];
			let tmpUpdateActions = [];
			for (let j = 0; j < tmpDeps.length; j++)
			{
				let tmpDep = tmpDeps[j];
				if (!tmpEarlierSet.has(tmpDep.To)) { continue; }
				if (tmpDep.LocalLink) { continue; }
				if (!tmpIncludeDev && tmpDep.Section === 'devDependencies') { continue; }
				tmpUpdateActions.push(
					{
						Op: 'update-dep',
						Dep: tmpDep.To,
						// The actual concrete Range is filled by the executor
						// at runtime by reading dep's current local version.
						// Plan time: store only the prefix and the OldRange
						// for human-readable diff.
						RangePrefix: tmpRangePrefix,
						Section: tmpDep.Section,
						OldRange: tmpDep.Range,
					});
			}

			if (tmpUpdateActions.length === 0) { continue; } // no actionable update edges (e.g. only devDep when excluded)

			let tmpActions = [];
			// FIRST: preflight-clean-tree. If the consumer has any uncommitted
			// state before the ripple starts touching it, halt so Steven can
			// resolve it manually (ripple only handles ready-to-go modules).
			tmpActions.push({ Op: 'preflight-clean-tree' });

			// Opt-in "bring all retold deps forward" step runs before the
			// authoritative update-dep actions. ncu writes npm-registry-latest
			// ranges; update-dep then overwrites the in-cone deps with the
			// just-published on-disk version. Both mutations end up in the
			// same commit below.
			if (tmpBringForward)
			{
				tmpActions.push({ Op: 'ncu-retold' });
			}
			tmpActions = tmpActions.concat(tmpUpdateActions);
			if (tmpRunInstall) { tmpActions.push({ Op: 'install' }); }
			if (tmpRunTest)    { tmpActions.push({ Op: 'test' }); }
			tmpActions.push({ Op: 'commit',  MessageTemplate: 'bump <deps>' });
			tmpActions.push({ Op: 'bump',    Kind: tmpConsumerBumpKind });
			tmpActions.push({ Op: 'publish' });
			// LAST: commit-final sweeps up the version bump + any built files
			// the publish process generated (dist bundles, lockfile churn).
			tmpActions.push({ Op: 'commit-final', MessageTemplate: 'NPM Version Bump and publish to <version>' });
			// Finally, push so the module is no longer ahead-by-N.
			if (tmpRunPush) { tmpActions.push({ Op: 'push' }); }

			tmpSteps.push(
				{
					Order: tmpSteps.length,
					Module: tmpName,
					Group: tmpGraph.Nodes.get(tmpName).Group,
					Kind: 'consumer',
					Actions: tmpActions,
				});

			tmpEarlierSet.add(tmpName);
		}

		let tmpAllInvolved = tmpSteps.map(function (pS) { return pS.Module; });

		let tmpPlanId = 'rplan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
		return {
			PlanId: tmpPlanId,
			Root: tmpRoot,
			TargetVersion: tmpTargetVersion,
			Options: { RangePrefix: tmpRangePrefix, ConsumerBumpKind: tmpConsumerBumpKind, IncludeDev: tmpIncludeDev, StopAtApps: tmpStopAtApps, RunInstall: tmpRunInstall, RunTest: tmpRunTest, RunPush: tmpRunPush, BringRetoldDepsForward: tmpBringForward },
			GeneratedAt: new Date().toISOString(),
			Graph:
				{
					Nodes: tmpAllInvolved.map((pN) => ({ Name: pN, Group: tmpGraph.Nodes.get(pN).Group })),
					Edges: tmpGraph.Edges.filter((pE) =>
						tmpAllInvolved.indexOf(pE.From) !== -1
							&& tmpAllInvolved.indexOf(pE.To) !== -1),
				},
			Steps: tmpSteps,
		};
	}
}

module.exports = RippleGraph;
module.exports.GROUP_ORDER = GROUP_ORDER;
