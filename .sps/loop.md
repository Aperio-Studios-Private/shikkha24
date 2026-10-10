# The Karpathy Loop, as applied to this project

Source: Karpathy's *autoresearch* repo, March 2026 — the loop Fortune called
"The Karpathy Loop". Its point is not the ML benchmark; it is that **the scarce
resource stops being engineering time and becomes the ability to define what
"good" means.** Karpathy's own framing: the human moves from experimenter to
experiment designer, and "the durable asset is the instructions and the evaluation
criteria, not the code."

This file is our `program.md`. It is the constraints, not the work.

---

## The three primitives, and why each one exists

| Primitive | In Autoresearch | Here | Without it |
|---|---|---|---|
| **Single editable asset** | only `train.py` may change | one file (or one named unit) per task | a fix leaks into neighbours; the diff stops being a hypothesis |
| **Scalar metric** | one number (`val_bpb`) | one number or one boolean, fixed **before** the edit | "it looks right" and "the endpoint returns 200" both pass while the goal is unmet |
| **Fixed budget** | 5 min per experiment | N attempts, then revert and record | an agent keeps poking a wrong theory until something appears to work |

The budget is the one people skip. It is the reason Karpathy's agent produced 20
*additive* improvements — every experiment that did not improve was reverted, so
the surviving diffs are all real.

---

## The loop

```
  1. STATE     Write the task block below. Metric and budget fixed BEFORE any edit.
  2. PREDICT   Say what the metric will read if the hypothesis is true, and what
               it reads if it is false. A prediction you cannot be wrong about.
  3. EDIT      Touch the single asset. Nothing else.
  4. MEASURE   Run the metric. Show the output.
  5. KEEP      Improved  -> commit, cite the measurement in the message.
               Degraded  -> revert (git checkout), record the miss, try a new
                            hypothesis from scratch.
  6. EXHAUSTED Budget spent -> revert and write the miss down. Do not widen the
                            asset to "just one more thing".
  7. RECORD    Loop block -> `.sps/tasks.md`. New failure -> `.sps/mistakes.md`.
```

---

## The task block

Copy into `.sps/tasks.md` under the task. All five fields are filled **before**
the first edit.

```
**Hypothesis**   One sentence: what is wrong, and why this change fixes it.
**Asset**        The ONLY file(s) this task may modify. Adding a file means a
                 new task, not an edit here.
**Metric**       One number or boolean. Chosen so that the goal being unmet
                 cannot also make it pass.
**Budget**       Attempts allowed. On exhaustion: revert and record.
**Degraded when** The exact condition that sends us back to step 5.
```

---

## The four traps this loop exists to catch

**1. A metric that cannot fail.** "The endpoint returns 200" is satisfied by a
CMS that cannot write, cannot log out, and serves a frozen error page. It was
used on 2026-10-10 to reason about the exact bug it could not detect. The metric
must be a property of the *goal*, not of the *system being up*.

**2. An asset that quietly grew.** Fixing the CLS meant touching `global.css`,
`Layout.astro`, a workflow, and a script. Four files became one un-reviewable
diff in which no single change could be attributed. That is the loop saying no.

**3. A harness that agrees with the bug.** The cPanel harness answered
`list_files` with `{name}`; the real host answers `{file}`. The fake agreed with
the client's misreading, so 72 checks passed while the delete set was always
empty. **A check that cannot disagree with the code is not a check.** Every fix
here is proved by reverting it and watching the suite go red.

**4. A fix applied to one twin and not the other.** `9471e5a` gave the static
deploy a per-run archive name. The CMS deploy kept the fixed name and blocked
itself four hours later. The presence of a fix in a sibling made it read as
handled. **When a defect has near-identical twins, the twin is part of the asset.**

---

## When NOT to loop

Some work has no scalar and must not be forced into one: design judgement,
copywriting, choosing a product direction. Pretending otherwise produces a
number that measures the wrong thing.

Two cases here that *are* loop-shaped despite looking editorial:

- **A host-health check** is a loop: hypothesis "the account can fork", metric
  `PASS 9/9`, budget 1. When a run produced a *false* PASS for a missing
  directory, the fix was not to retry but to add the counter-proof.
- **Performance** is the purest example in this repo: CLS is a scalar with a
  published threshold, and it is the reason the budget exists.

---

## Recording misses

A reverted experiment is not wasted. It goes in `.sps/mistakes.md` with
**what happened / why it mattered / the rule**, and it must name the *metric that
failed to catch it* — that is the part that makes the next one cheaper.

See `.sps/mistakes.md` M24–M28 for the five produced on 2026-10-10, the day this
loop was adopted: every one of them is a loop violation, found the expensive way.