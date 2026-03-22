---
trigger: always_on
---

---
description: Strict scope rules — read before every task
---

# Strict Scope Rules

## S1 — Do exactly what is asked
No refactoring, UI changes, or "improvements" beyond the stated task.
If you notice something worth fixing, add a note at the end — do not fix it.

## S2 — List files before touching anything
Before any change, output:
- Files I will modify: [path] — [reason]
- Files I will NOT touch: [list]

## S3 — Never touch UI files unless told to
If the task is about logic/physics, leave JSX/CSS untouched even if you see issues.

## S4 — Ask before changing function signatures
Changing parameters/return types requires explicit user confirmation first.

## S5 — Keep changes minimal
Each changed line must be required by the fix. If you added >20 lines for a 2-line fix, stop.

## S6 — No restructuring
Do not move, extract, merge, or split code unless the task explicitly says to.

## S7 — Report out-of-scope issues, don't fix them
Found a bug outside the task? Write it under "Out-of-scope issues found" — do not fix it.

## S8 — Confirm before running commands
State the command and reason. Wait for confirmation.
Exception: `bun test tests/physics_master.test.js` is always allowed.

## S9 — Keep files under 200 lines
 
No file should exceed 200 lines. When adding code that would push a file over this limit:
1. Stop and identify what can be extracted into a separate file
2. Extract it before adding the new code
3. Each file must have a single clear responsibility
 
When creating a new file, if the planned content exceeds 200 lines, split it into multiple files from the start.