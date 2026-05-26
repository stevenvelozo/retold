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
		return this.getTransitiveConsumersOfAll([pRoot], pOptions);
	}

	/**
	 * Multi-source variant: transitive consumers of any root in pRoots, with
	 * all roots pre-marked as visited so they never appear in the result. Used
	 * by buildPlan when the user selects multiple sibling producers (e.g. the
	 * meadow-connection-* set).
	 *
	 * @param {string[]} pRoots
	 * @returns {string[]} module names, not including any of pRoots
	 */
	getTransitiveConsumersOfAll(pRoots, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpIncludeDev = (tmpOptions.IncludeDev !== false);
		let tmpStopAtApps = !!tmpOptions.StopAtApps;

		let tmpGraph = this.build();
		let tmpVisited = new Set();
		let tmpQueue = [];
		// Pre-mark every root so back-edges through a dep cycle (e.g., fable-log
		// → pict-section-content for docs, looping back to fable-log) don't
		// re-add a root to the result and break the topological order
		// downstream.
		for (let i = 0; i < pRoots.length; i++)
		{
			tmpVisited.add(pRoots[i]);
			tmpQueue.push(pRoots[i]);
		}
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
	 * Build a full ripple plan rooted at one or more selected producers.
	 *
	 * @param {object} pOptions
	 * @param {string[]} [pOptions.Roots]    Selected producer module names. May
	 *   contain a single name (legacy single-root) or many siblings (e.g. the
	 *   meadow-connection-* set). At least one of Roots / Root must be set.
	 * @param {string}  [pOptions.Root]      Legacy single-root field; treated
	 *   as Roots:[Root] when Roots is not provided.
	 * @param {string}  [pOptions.RangePrefix='^']      Range prefix for consumers
	 * @param {string}  [pOptions.ProducerBumpKind='patch'] Bump kind for the
	 *   `bump-if-needed` action on producer steps. Only applied when local
	 *   version is not already ahead of npm.
	 * @param {string}  [pOptions.ConsumerBumpKind='patch'] patch|minor|major
	 * @param {boolean} [pOptions.IncludeDev=false] devDep consumers reliably
	 *   introduce cycles (test harnesses) so defaulted OFF.
	 * @param {boolean} [pOptions.StopAtApps=true]
	 * @param {boolean} [pOptions.RunInstall=true]
	 * @param {boolean} [pOptions.RunTest=true]
	 * @param {boolean} [pOptions.RunPush=true]
	 * @param {boolean} [pOptions.BringRetoldDepsForward=false] When true, each
	 *   consumer step begins with an `ncu-retold` action: `npx npm-check-updates
	 *   -u --filter <ecosystem>`.
	 * @param {boolean} [pOptions.RunPrepareDocs=false] When true, each step runs
	 *   `npx quack prepare-docs` just before the bump, so any regenerated doc
	 *   indices get swept into the publish commit alongside the version bump
	 *   and built artifacts.
	 * @returns {object} plan
	 */
	buildPlan(pOptions)
	{
		let tmpOptions = pOptions || {};

		// Flat-mode short-circuit: bulk-apply a fixed action list to a
		// set of modules with no producer/consumer ordering.  Used by
		// the "Ripple selected" entry point on the Modules table.
		if (tmpOptions.Mode === 'flat')
		{
			return this._buildFlatPlan(tmpOptions);
		}

		// Accept Roots[] (preferred) or fall back to legacy single Root.
		let tmpRoots;
		if (Array.isArray(tmpOptions.Roots) && tmpOptions.Roots.length > 0)
		{
			tmpRoots = tmpOptions.Roots.slice();
		}
		else if (tmpOptions.Root)
		{
			tmpRoots = [tmpOptions.Root];
		}
		else
		{
			throw new Error('buildPlan requires Roots (string[]) or Root (string)');
		}
		// De-dup defensively.
		tmpRoots = Array.from(new Set(tmpRoots));
		let tmpRootSet = new Set(tmpRoots);

		let tmpRangePrefix = tmpOptions.RangePrefix !== undefined ? tmpOptions.RangePrefix : '^';
		let tmpConsumerBumpKind = tmpOptions.ConsumerBumpKind || 'patch';
		let tmpProducerBumpKind = tmpOptions.ProducerBumpKind || 'patch';
		// IncludeDev defaults to false — devDep cycles (test harnesses)
		// reliably trip the topo fallback, so opt-in only.
		let tmpIncludeDev = (tmpOptions.IncludeDev === true);
		// StopAtApps, RunInstall, RunTest, RunPush all default to TRUE
		// (Steven's preferred workflow — stay out of retold-remote/
		// retold-databeacon, refresh lockfiles, and test/push by default).
		let tmpStopAtApps = (tmpOptions.StopAtApps !== false);
		let tmpRunInstall = (tmpOptions.RunInstall !== false);
		let tmpRunTest = (tmpOptions.RunTest !== false);
		let tmpRunPush = (tmpOptions.RunPush !== false);
		let tmpBringForward = !!tmpOptions.BringRetoldDepsForward;
		let tmpRunPrepareDocs = !!tmpOptions.RunPrepareDocs;

		let tmpGraph = this.build();
		for (let i = 0; i < tmpRoots.length; i++)
		{
			if (!tmpGraph.Nodes.has(tmpRoots[i]))
			{
				throw new Error('Root "' + tmpRoots[i] + '" is not in the ecosystem.');
			}
		}

		// Cone = Roots ∪ transitive consumers of any Root (roots pre-marked
		// so they never appear in the consumer expansion).
		let tmpTransitive = this.getTransitiveConsumersOfAll(tmpRoots,
			{
				IncludeDev: tmpIncludeDev,
				StopAtApps: tmpStopAtApps,
			});
		let tmpCone = tmpRoots.concat(tmpTransitive);

		// Topo-sort the entire cone (roots + consumers together). Producers
		// land first because they have no in-cone dependencies; if a Root
		// happens to depend on another Root, the topo sort orders them
		// correctly. Per-step kind is decided below from tmpRootSet.
		let tmpOrder = this.topoSort(tmpCone, { IncludeDevSections: tmpIncludeDev });

		let tmpSteps = [];
		let tmpEarlierSet = new Set();

		for (let i = 0; i < tmpOrder.length; i++)
		{
			let tmpName = tmpOrder[i];
			let tmpIsRoot = tmpRootSet.has(tmpName);

			// Gather in-cone deps that come before this node in topo order.
			// For most siblings this is empty; for a Root that depends on
			// another Root (rare), or for any consumer (always non-empty),
			// this drives the update-dep actions.
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
						RangePrefix: tmpRangePrefix,
						Section: tmpDep.Section,
						OldRange: tmpDep.Range,
					});
			}

			let tmpActions = [];
			let tmpKind;

			if (tmpIsRoot)
			{
				tmpKind = 'producer';
				// Preflight ensures the producer's tree is clean before any
				// modification — same guarantee the old single-root flow had.
				tmpActions.push({ Op: 'preflight-clean-tree' });

				// Rare case: a Root that depends on another in-cone module
				// (e.g. user picked fable + fable-log). Treat the dep prep
				// like a consumer step's, but still finish with the producer
				// bump-if-needed semantics.
				if (tmpUpdateActions.length > 0)
				{
					if (tmpBringForward) { tmpActions.push({ Op: 'ncu-retold' }); }
					tmpActions = tmpActions.concat(tmpUpdateActions);
					if (tmpRunInstall) { tmpActions.push({ Op: 'install' }); }
					if (tmpRunTest)    { tmpActions.push({ Op: 'test' }); }
					tmpActions.push({ Op: 'commit', MessageTemplate: 'bump <deps>' });
				}

				// Regenerate the documentation index before the bump so any
				// changes get swept into commit-final alongside the bump and
				// built artifacts.
				if (tmpRunPrepareDocs) { tmpActions.push({ Op: 'prepare-docs' }); }

				// bump-if-needed: at runtime, compare local vs npm. If local
				// is already ahead (the user pre-bumped), skip the bump and
				// proceed to publish. If equal, run `npm version <kind>`.
				// If local is behind npm, fail the ripple.
				tmpActions.push({ Op: 'bump-if-needed', Kind: tmpProducerBumpKind });
				tmpActions.push({ Op: 'publish' });
				// commit-final sweeps the bump (if it ran) and any artifacts
				// the publish process regenerated (built bundles, lockfile).
				tmpActions.push({ Op: 'commit-final', MessageTemplate: 'NPM Version Bump and publish to <version>' });
				if (tmpRunPush) { tmpActions.push({ Op: 'push' }); }
			}
			else
			{
				tmpKind = 'consumer';
				// Defensive: a non-root in the cone reached us only via
				// consumer-of expansion, so it MUST have an in-cone dep. If
				// somehow it doesn't (e.g. all its in-cone deps are devDep
				// when devDeps are excluded), drop the step rather than
				// emit a meaningless publish.
				if (tmpUpdateActions.length === 0) { continue; }

				tmpActions.push({ Op: 'preflight-clean-tree' });
				if (tmpBringForward) { tmpActions.push({ Op: 'ncu-retold' }); }
				tmpActions = tmpActions.concat(tmpUpdateActions);
				if (tmpRunInstall) { tmpActions.push({ Op: 'install' }); }
				if (tmpRunTest)    { tmpActions.push({ Op: 'test' }); }
				tmpActions.push({ Op: 'commit',  MessageTemplate: 'bump <deps>' });
				if (tmpRunPrepareDocs) { tmpActions.push({ Op: 'prepare-docs' }); }
				tmpActions.push({ Op: 'bump',    Kind: tmpConsumerBumpKind });
				tmpActions.push({ Op: 'publish' });
				tmpActions.push({ Op: 'commit-final', MessageTemplate: 'NPM Version Bump and publish to <version>' });
				if (tmpRunPush) { tmpActions.push({ Op: 'push' }); }
			}

			tmpSteps.push(
				{
					Order: tmpSteps.length,
					Module: tmpName,
					Group: tmpGraph.Nodes.get(tmpName).Group,
					Kind: tmpKind,
					Actions: tmpActions,
				});

			tmpEarlierSet.add(tmpName);
		}

		let tmpAllInvolved = tmpSteps.map(function (pS) { return pS.Module; });

		let tmpPlanId = 'rplan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
		return {
			PlanId: tmpPlanId,
			Roots: tmpRoots.slice(),
			// Back-compat for any view code reading the legacy single-root field.
			Root: tmpRoots[0],
			// TargetVersion no longer drives planning (resolved at runtime via
			// bump-if-needed + on-disk reads). Echoed for back-compat display.
			TargetVersion: tmpOptions.TargetVersion || null,
			Options:
				{
					RangePrefix: tmpRangePrefix,
					ConsumerBumpKind: tmpConsumerBumpKind,
					ProducerBumpKind: tmpProducerBumpKind,
					IncludeDev: tmpIncludeDev,
					StopAtApps: tmpStopAtApps,
					RunInstall: tmpRunInstall,
					RunTest: tmpRunTest,
					RunPush: tmpRunPush,
					BringRetoldDepsForward: tmpBringForward,
					RunPrepareDocs: tmpRunPrepareDocs,
				},
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

	// ─────────────────────────────────────────────
	//  Flat (bulk-apply) plan — no producer/consumer ordering.
	// ─────────────────────────────────────────────
	//
	// The "Ripple selected" entry point on the Modules table feeds in
	// a flat list of modules.  Each module gets a step whose actions
	// are chosen from a fixed set of toggled operations:
	//
	//   - ncu        (`npx npm-check-updates -u [--filter <ecosystem>]`)
	//   - bump       (`npm version <kind>`)
	//   - commit     (`git commit -am <user-message>`)
	//   - push       (`git push`)
	//   - publish    (`npm publish` — pauses for user confirmation)
	//
	// No topo-sort, no dependency walk, no version-range rewriting on
	// consumers.  Order within a step: ncu → bump → commit → push →
	// publish (publish last so a failed publish doesn't leave stuff
	// uncommitted).
	//
	// Required options:
	//   - Mode === 'flat'
	//   - Modules: string[]
	//   - Operations: {
	//       Ncu, NcuScope, Bump, BumpKind, Commit, CommitMessage, Push, Publish
	//     }
	_buildFlatPlan(pOptions)
	{
		let tmpModules = Array.isArray(pOptions.Modules) ? pOptions.Modules.slice() : [];
		if (tmpModules.length === 0)
		{
			throw new Error('flat-mode buildPlan requires Modules (string[])');
		}
		let tmpOps = pOptions.Operations || {};

		// Validate every module is known to the manifest before we
		// build steps — surface a clean error rather than letting the
		// executor 404 each one in turn.
		let tmpGraph = this.build();
		for (let i = 0; i < tmpModules.length; i++)
		{
			if (!tmpGraph.Nodes.has(tmpModules[i]))
			{
				throw new Error('Module "' + tmpModules[i] + '" is not in the ecosystem.');
			}
		}

		let tmpDoNcu     = !!tmpOps.Ncu;
		let tmpNcuScope  = (tmpOps.NcuScope === 'all') ? 'all' : 'retold';
		let tmpDoBump    = !!tmpOps.Bump;
		let tmpBumpKind  = tmpOps.BumpKind || 'patch';
		let tmpDoCommit  = !!tmpOps.Commit;
		let tmpCommitMsg = (tmpOps.CommitMessage || '').trim();
		let tmpDoPush    = !!tmpOps.Push;
		let tmpDoPublish = !!tmpOps.Publish;
		let tmpDoCreatePr  = !!tmpOps.CreatePR;
		let tmpPrTitle     = (tmpOps.PRTitle || '').trim();
		let tmpPrBody      = (typeof tmpOps.PRBody === 'string') ? tmpOps.PRBody : '';
		let tmpDoApprovePr = !!tmpOps.ApprovePR;
		let tmpDoMergePr   = !!tmpOps.MergePR;
		let tmpMergeStrategy = (tmpOps.MergeStrategy === 'rebase' || tmpOps.MergeStrategy === 'merge') ? tmpOps.MergeStrategy : 'squash';
		let tmpAdminMerge  = !!tmpOps.AdminMerge;

		if (tmpDoCommit && !tmpCommitMsg)
		{
			throw new Error('flat-mode commit requires a non-empty CommitMessage.');
		}
		if (!tmpDoNcu && !tmpDoBump && !tmpDoCommit && !tmpDoPush && !tmpDoPublish && !tmpDoCreatePr && !tmpDoApprovePr && !tmpDoMergePr)
		{
			throw new Error('flat-mode plan needs at least one operation toggled on.');
		}
		// Logical ordering: approve/merge need a PR. If the user opted into
		// approve or merge without create, they're trusting that a PR already
		// exists for the current branch — surface that intent clearly here.
		if ((tmpDoApprovePr || tmpDoMergePr) && !tmpDoCreatePr)
		{
			// Allowed, but documented: the action will fail per-module if no PR exists.
		}

		let tmpSteps = [];
		for (let i = 0; i < tmpModules.length; i++)
		{
			let tmpName = tmpModules[i];
			let tmpNode = tmpGraph.Nodes.get(tmpName);
			let tmpActions = [];
			if (tmpDoNcu)
			{
				tmpActions.push({ Op: 'ncu-retold', Scope: tmpNcuScope });
			}
			if (tmpDoBump)
			{
				tmpActions.push({ Op: 'bump', Kind: tmpBumpKind });
			}
			if (tmpDoCommit)
			{
				// commit-final takes MessageTemplate; our message is a
				// verbatim string (no <version> token) so it passes
				// through unchanged.
				tmpActions.push({ Op: 'commit-final', MessageTemplate: tmpCommitMsg });
			}
			if (tmpDoPush)
			{
				tmpActions.push({ Op: 'push' });
			}
			if (tmpDoPublish)
			{
				tmpActions.push({ Op: 'publish' });
			}
			if (tmpDoCreatePr)
			{
				tmpActions.push({ Op: 'create-pr', Title: tmpPrTitle, Body: tmpPrBody });
			}
			if (tmpDoApprovePr)
			{
				tmpActions.push({ Op: 'approve-pr' });
			}
			if (tmpDoMergePr)
			{
				tmpActions.push({ Op: 'merge-pr', Strategy: tmpMergeStrategy, Admin: tmpAdminMerge });
			}
			tmpSteps.push({
				Order:   i,
				Module:  tmpName,
				Group:   tmpNode && tmpNode.Group ? tmpNode.Group : 'Other',
				Kind:    'flat',
				Actions: tmpActions
			});
		}

		return {
			PlanId:        'flat-' + Date.now().toString(36),
			Mode:          'flat',
			Roots:         tmpModules.slice(),
			Modules:       tmpModules.slice(),
			TargetVersion: null,
			GeneratedAt:   new Date().toISOString(),
			Options:
				{
					Mode:       'flat',
					Operations:
						{
							Ncu:           tmpDoNcu,
							NcuScope:      tmpNcuScope,
							Bump:          tmpDoBump,
							BumpKind:      tmpBumpKind,
							Commit:        tmpDoCommit,
							CommitMessage: tmpCommitMsg,
							Push:          tmpDoPush,
							Publish:       tmpDoPublish,
							CreatePR:      tmpDoCreatePr,
							PRTitle:       tmpPrTitle,
							PRBody:        tmpPrBody,
							ApprovePR:     tmpDoApprovePr,
							MergePR:       tmpDoMergePr,
							MergeStrategy: tmpMergeStrategy,
							AdminMerge:    tmpAdminMerge
						}
				},
			Graph:
				{
					Nodes: tmpModules.map((pN) => ({ Name: pN, Group: tmpGraph.Nodes.get(pN).Group })),
					Edges: []
				},
			Steps: tmpSteps
		};
	}
}

module.exports = RippleGraph;
module.exports.GROUP_ORDER = GROUP_ORDER;
