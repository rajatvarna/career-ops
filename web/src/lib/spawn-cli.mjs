import { spawn } from "node:child_process";

// Plain .mjs (same pattern as tracker-table.mjs/clean-chips.mjs) so
// tests/lib/spawn-cli.test.mjs can import it directly under Node. Import it with the
// .mjs extension included (e.g. "@/lib/spawn-cli.mjs") — unlike .ts files,
// which TypeScript resolves without an extension, ESM specifiers for plain
// JS modules must be fully specified.

/**
 * Quote one argv token for cmd.exe when building a `shell: true` command line.
 * Node joins spawn argv without escaping when shell is enabled, so every token
 * (including user prompts) must be quoted or `&`, `|`, `>`, `"`, etc. inject.
 */
export function quoteCmdArg(s) {
  const str = String(s);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Spawn a headless agent CLI with stdin closed.
 *
 * CLIs such as `codex exec` read additional prompt text from stdin when a pipe
 * is left open. A web request never supplies that extra input, so leaving the
 * default pipe open makes Codex wait forever without producing stdout. This is
 * the ONLY spawn path for CLI-invoking routes — every call site should use it
 * instead of `node:child_process`'s `spawn` directly, so the fix can't drift.
 *
 * It also replaces the `stdio: ["ignore", ...]` the apply planners used to spell
 * for the same reason — one mechanism means one place for this to be right.
 * The options type omits `stdio` on purpose: stdout/stderr must stay pipes for
 * every caller's stream handlers, and TypeScript keeps `child.stdout` non-null
 * only under that contract. `stdin` is still optional-chained so an untyped
 * caller passing `stdio` anyway degrades safely (null stdin) instead of throwing.
 *
 * @param {string} binPath
 * @param {string[]} args
 * @param {import("node:child_process").SpawnOptionsWithoutStdio} options
 */
export function spawnHeadlessCli(binPath, args, options) {
  // npm global shims on Windows are .cmd/.bat wrappers; Node cannot spawn them
  // directly (EINVAL) — only with shell: true. shell:true joins argv without
  // escaping, so quote every token for cmd.exe before passing a single command.
  const needsShell =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
  let spawnCmd = binPath;
  let spawnArgs = args;
  if (needsShell) {
    spawnCmd = [quoteCmdArg(binPath), ...args.map(quoteCmdArg)].join(" ");
    spawnArgs = [];
  }
  const child = spawn(spawnCmd, spawnArgs, needsShell ? { ...options, shell: true } : options);
  child.stdin?.end();
  return child;
}
