/**
 * Retold Manager -- Commit Composer
 *
 * Centralizes the "build a safe `git commit` invocation from a
 * human-typed message" logic. The TUI and the upcoming web transport
 * both need this, and the current inline implementation in App.js
 * (shell-escaped single-quote wrap) is fragile.
 *
 * Historical behavior (from Retold-Manager-App.js):
 *
 *     let tmpMessage = pValue.trim().replace(/'/g, "'\\''");
 *     processRunner.run('git', ['commit', '-a', '-m', `'${tmpMessage}'`], cwd);
 *
 * That was written for ProcessRunner's `shell:true` mode, where the
 * outer shell needs a quoted string. Our new core ProcessRunner also
 * uses `shell:true` (for now), so we preserve that behavior — but we
 * also expose a shell-less form for the web transport / any caller
 * that would prefer to spawn with `shell:false`.
 */

// Characters that force us to single-quote in shell mode. A bare
// message like "bump foo" is fine unquoted; anything with whitespace,
// backticks, dollar, semicolon, pipe, etc. needs quoting.
const SHELL_UNSAFE_RE = /[^A-Za-z0-9_\-.,/:=+@]/;

/**
 * Produce arguments suitable for ProcessRunner.run({Command:'git', Args:[...]})
 * when the runner is in shell:true mode. Returns an object so callers can
 * pick whichever form fits their spawn config.
 *
 * @param {string} pMessage Human-typed commit message (unescaped, multi-line OK).
 * @param {object} [pOptions]
 * @param {boolean} [pOptions.AddAll=true]   Include `-a` (commit all tracked changes).
 * @returns {{ Command: 'git', Args: string[], ShellArgs: string[], Message: string }}
 *   Command/Args: shell-safe form for shell:false spawn.
 *   ShellArgs:    args with the message wrapped in single quotes; use this
 *                 with shell:true spawns (or `exec`).
 */
function buildCommitArgs(pMessage, pOptions)
{
	let tmpOptions = pOptions || {};
	let tmpAddAll = (tmpOptions.AddAll !== false);

	let tmpMessage = (pMessage || '').trim();

	// Non-shell form — pass the message as one arg. Safe regardless of content.
	let tmpArgs = ['commit'];
	if (tmpAddAll) { tmpArgs.push('-a'); }
	tmpArgs.push('-m');
	tmpArgs.push(tmpMessage);

	// Shell form — wrap in single quotes, escape any internal single quotes.
	// Only wrap when necessary so the rendered command string stays readable
	// for simple messages like "bump foo".
	let tmpShellMessage = SHELL_UNSAFE_RE.test(tmpMessage)
		? `'${tmpMessage.replace(/'/g, "'\\''")}'`
		: tmpMessage;

	let tmpShellArgs = ['commit'];
	if (tmpAddAll) { tmpShellArgs.push('-a'); }
	tmpShellArgs.push('-m');
	tmpShellArgs.push(tmpShellMessage);

	return {
		Command: 'git',
		Args: tmpArgs,
		ShellArgs: tmpShellArgs,
		Message: tmpMessage,
	};
}

/**
 * Validate a commit message before running. Mirrors what git itself would do
 * but without spawning a process, so the TUI can block sub-par messages.
 *
 * @param {string} pMessage
 * @returns {{ Ok: boolean, Problems: string[] }}
 */
function validateMessage(pMessage)
{
	let tmpProblems = [];
	let tmpMessage = (pMessage || '').trim();

	if (tmpMessage.length === 0)
	{
		tmpProblems.push('Commit message is empty.');
	}
	if (tmpMessage.length > 0 && tmpMessage.length < 3)
	{
		tmpProblems.push('Commit message is suspiciously short (<3 chars).');
	}
	// git itself will reject a message with a pure control-character payload;
	// short-circuit here too.
	if (tmpMessage.length > 0 && /^[\x00-\x1F]+$/.test(tmpMessage))
	{
		tmpProblems.push('Commit message is only control characters.');
	}

	return { Ok: tmpProblems.length === 0, Problems: tmpProblems };
}

module.exports =
{
	buildCommitArgs,
	validateMessage,
};
