<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in `cms/`

> The mandatory project rules (1–14) live in the repository-root mirrors —
> `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Read those first; this file only adds
> what is specific to the CMS workspace. Do not restate or fork the root rules
> here, so the three mirrors stay the single source of truth.

## Never commit a scratch file (T-77)

A throwaway harness — a probe, a fault-injection rig, a one-off script used to
prove a fix — must be handled deliberately, because `cms/src/` is a directory an
agent stages wholesale and a stray `.ts` there ships with the next commit.

- Name it so it cannot be mistaken for product code: `verify-tmp-*.ts` or a
  `_`-prefixed name inside `cms/src/verify/`.
- List it in the task entry **before** creating it, so its existence is tracked
  rather than discovered later.
- **The agent that creates it deletes it** in the same session — before staging
  anything. A scratch file that outlives its task will eventually be committed by
  someone else.
- If the proof it carries is worth keeping, promote it to a real harness under
  `cms/src/verify/` and wire it into `cms/package.json` as a `verify:*` script.
  Deleting it and recording the result in the commit message is equally fine —
  leaving it in place is not.

This is not hypothetical: `cms/src/verify-tmp-t63.ts` (15.7 KB) and two earlier
`_probe`/`_sched` files were all created this way, and all three had to be hunted
down before their work could be committed cleanly.

