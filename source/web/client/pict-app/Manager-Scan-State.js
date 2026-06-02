/**
 * Manager Scan — action state (single RENDER source).
 *
 * The SERVER computes `NextAction` (one source of truth — see
 * ModuleIntrospector.deriveNextAction). This module only maps that code to a
 * badge color + human label and answers "does this module need action?" for the
 * filters. Shared by the sidebar module list and the LogBar scan table so the
 * two never disagree.
 *
 * NextAction codes:
 *   commit · pull-fork · push · sync-upstream · create-pr · in-sync
 * (non-forkable modules only ever produce commit / pull-fork / push / in-sync.)
 */

// code → { Label (short verb phrase), Badge (CSS state modifier), Tip (tooltip) }
const ACTION_META =
{
	'commit':        { Label: 'commit',            Badge: 'commit',  Tip: 'Uncommitted changes — commit them' },
	'pull-fork':     { Label: 'pull from fork',     Badge: 'pull',    Tip: 'Your fork has commits your local checkout lacks — pull them down' },
	'push':          { Label: 'push to fork',       Badge: 'push',    Tip: 'Local commits not yet on your fork — push them' },
	'sync-upstream': { Label: 'sync from upstream', Badge: 'sync',    Tip: 'The org moved ahead — sync (rebase) your fork from upstream' },
	'create-pr':     { Label: 'open PR',            Badge: 'pr',      Tip: 'Your fork is ahead of the org — open a pull request' },
	'in-sync':       { Label: 'in sync',            Badge: null,      Tip: '' },
};

// The server's NextAction, defaulting to in-sync for missing/errored/stale-cache
// entries (a rescan repopulates it).
function nextAction(pScanEntry)
{
	if (!pScanEntry || pScanEntry.Error) { return 'in-sync'; }
	return pScanEntry.NextAction || 'in-sync';
}

function actionMeta(pScanEntry)
{
	return ACTION_META[nextAction(pScanEntry)] || ACTION_META['in-sync'];
}

// "Needs attention" — drives the sidebar/LogBar action filters.
function needsAction(pScanEntry)
{
	return nextAction(pScanEntry) !== 'in-sync';
}

// Badge CSS state modifier (e.g. 'commit', 'push', 'sync', 'pr', 'pull'), or
// null when in-sync / unknown (no badge rendered).
function badgeState(pScanEntry)
{
	return actionMeta(pScanEntry).Badge;
}

function actionLabel(pScanEntry)
{
	return actionMeta(pScanEntry).Label;
}

function badgeTooltip(pScanEntry)
{
	return actionMeta(pScanEntry).Tip;
}

// Sort rank — most-urgent action first (so a "Next action" column sorts the
// things you should deal with to the top). in-sync sinks to the bottom.
const ACTION_RANK = { 'commit': 1, 'pull-fork': 2, 'push': 3, 'sync-upstream': 4, 'create-pr': 5, 'in-sync': 99 };
function actionRank(pScanEntry)
{
	let tmpR = ACTION_RANK[nextAction(pScanEntry)];
	return (tmpR === undefined) ? 50 : tmpR;
}

module.exports = { ACTION_META, ACTION_RANK, nextAction, actionMeta, needsAction, badgeState, actionLabel, badgeTooltip, actionRank };
