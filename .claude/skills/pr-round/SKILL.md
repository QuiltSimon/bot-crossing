---
name: pr-round
description: Review the open PRs on Bot Crossing and report back in plain language — what is a bug, what is a feature, what conflicts, what is unsafe. Use when Jarren says "pr round", "check the PRs", "any new PRs", "review the queue", or after contributors have been active. Reviews and reports only; it never merges, closes, comments, or pushes without being told.
---

# PR round

Bot Crossing takes PRs as feature requests with a reference implementation attached, batches
them, and lands the intent in one branch. This skill is the review half of that: work out what
is actually in the queue, test what can be tested, and hand Jarren a picture he can make
decisions from.

**Report first. He decides. Then you build.** Do not merge, close, comment, push, or open a PR
until he says so. Those are the only irreversible things here and they are all his call.

## What this project will not accept

Check every PR against these. They are in `DECISIONS.md` and each was written after something
went wrong:

1. **Nothing is written to a harness.** `data/colony.json` is the only file this project writes.
   An adapter with a `setArchived`, or anything that mutates a transcript or session record, is
   a no regardless of how well it is done. The test suite asserts this; a PR that adds one will
   fail it.
2. **Nothing is read from or executed inside another application's bundle.** Not
   `/Applications/Whatever.app/...`, not a PATH entry that symlinks into one. This binned two of
   Jarren's apps once via Gatekeeper — check `realpath` on anything resolved from `PATH`.
   Matching a string in `ps` output is fine; that is not launching anything.
3. **No shell strings.** `spawn` with an argument array. `cmd /c`, `osascript ... do script`, and
   anything built by joining quoted parts are all the same mistake wearing different clothes.
4. **One shape per seam.** If two PRs widen the same interface differently, that is the headline
   of the report — say so and recommend one, rather than reviewing them as if both could land.
5. **Read heads and tails, cache against mtime, never block the scan.** It runs every 15 seconds.

## Doing the round

### 1. Find what changed

```bash
gh pr list --state open --limit 60 --json number,title,author,additions,deletions,changedFiles,isDraft,updatedAt
```

The remote says `jarrenrocks/bot-crossing`; that redirects to `Station-Sciences/bot-crossing`
and `gh` resolves it there. Same repo — do not "fix" it.

Fetch each one as a local branch (`git fetch origin pull/N/head:pr-N`) so it can be run. If a PR
was reviewed in an earlier round, diff the old head against the new one rather than re-reading
it whole.

Watch for a branch that has cherry-picked `main`'s commits under new SHAs — the GitHub diff then
shows hundreds of lines that are already merged. Check what a real merge would change:
`git checkout -B tmp origin/main && git merge --no-commit pr-N`.

### 2. Actually run them

This is the part that earns the report. Jarren has real data for several harnesses; use it.

- **Adapters** — run `scanThreads()` against the real store. Check thread counts, that no field
  is `undefined`, that ids are prefixed, that `project` resolves to a real folder, and the cost
  of a cold and a warm scan.
- **Server changes** — drive the API over a real socket with `BOT_CROSSING_DATA` pointed at a
  scratch directory. Never at the user's own `data/`.
- **UI changes** — `preview_start` and click the thing. Half of the worst bugs found so far were
  only visible on screen: astronauts piling up at the ramp, the whole crew vanishing, zones
  floating apart. **Read the browser console** — a `GL_INVALID_OPERATION` is not cosmetic, it
  means a draw call was dropped entirely.
- **Claims** — if a PR says a deep link works, check it. On macOS,
  `lsregister -dump | grep 'scheme:'` says whether anything is registered. A route that came from
  reading an app's bundle is rule 2 above.

Say what you could not test. Windows and Linux cannot be verified from Jarren's Mac, and that is
worth stating plainly every time rather than implying coverage.

### 3. Find the conflicts

Textual, across every pair:

```bash
git merge-tree --write-tree pr-A pr-B   # look for CONFLICT
```

Semantic conflicts matter more and `git` will not find them. Two PRs that merge cleanly and then
break each other is the most expensive thing in a queue. The way to catch them: when one PR adds
a field to a shared structure and another adds code that enumerates that structure, check that
the second knows about the first. `mergeState` in `src/game/merge-state.js` is the classic — a
field it forgets is silently dropped on the first conflicting save.

### 4. Report

Plain language, human to human. Jarren is deciding, not grading — give him what he needs and a
recommendation, not a rubric.

- **Lead with anything unsafe**, then anything that fails on his machine, then everything else.
- **Group as bugs / platform / harnesses / features.** He asks for features listed separately;
  they are additions, not fixes, and he weighs them differently.
- **Quantify.** "22 of 28 zones are dormant" and "43% of the badge was unclickable" land; "this
  could be improved" does not.
- **Recommend one option** where PRs compete. Say why, in a sentence.
- **Name what you did not test**, and what only the contributor can check — they have machines he
  does not.
- **Be brief.** He has said twice that the write-ups run long. A table beats a paragraph, a
  sentence beats a table where it fits.

Then stop and let him decide.

## After he decides

### Build it

One branch off `main`, commits grouped by theme rather than by PR. Each commit message says what
was wrong and why the fix is shaped the way it is — match the codebase's voice, which explains
*why*, especially why an obvious approach was rejected. `Co-Authored-By` for contributors whose
work is in it.

House style: no semicolons, single quotes, 2-space indent, ~110 columns.

Update as you go, not at the end:
- `README.md` — the harness table, the keys table, anything it now says wrongly
- `DECISIONS.md` — if a new rule got settled
- `CONTRIBUTING.md` — if what is expected of contributors changed
- `npm test` — must stay green, and new load-bearing logic wants a test

Then `npm test` and `npx vite build`, and run it in the browser once more before saying it works.

### Close the round

Only when he says. Open the PR against `main` with a description grouped the same way as the
report, then on each contributor PR:

> Thanks for the PR! This is implemented in `<link>` — give it a try and let me know what you
> think.

Same message for everyone, comment then close. Leave open anything not addressed, and say which
and why.

## Standing state

Keep this current — it is what makes the next round quick.

- **Harnesses read:** Claude Code, Codex, Cursor (agent transcripts only)
- **Known gaps:** Cursor composer/sidebar threads live in a ~2.3 GB `state.vscdb` and are not
  read; CLI-open is Linux-only, macOS and Windows have no terminal fallback
- **Parked:** #7 Hermes — `detect()` passes but `scanThreads()` throws `no such table: sessions`
  on Jarren's machine; his `~/.hermes/state.db` has one table, `async_delegations`. Needs the
  contributor to say which Hermes and what version
- **Untested surfaces:** the whole render layer, real Windows, real Linux
