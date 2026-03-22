---
trigger: always_on
---

---
description: SimuLearn debug rules — read before every fix
---

# SimuLearn Rules

## R1 — Trace props both ends
Most bugs = prop passed but never destructured on the other end. Check source AND receiver.

## R2 — Never mix coordinate systems
- World = meters, Y-up → used in simState, UI, wx/wy handlers
- Matter px = pixels, Y-down → body.position, body.velocity
- Screen px = pixels, Y-down → canvas rendering
Always use: `worldToMatter()` `matterToWorld()` `toScreen()`
Never: `body.position.x * PPM` (already px), `toScreen(body.position.x)` (needs conversion first)

## R3 — Event `e` must reach the handler
Check that `e.shiftKey`, `e.clientX` etc. are not dropped by intermediate handlers.

## R4 — Time rules
- `time = totalPhysicsTicks * (FIXED_DELTA_MS / 1000)` — never add to time directly
- `timeScale` = ticks per frame, not seconds per tick
- Never use `displayTime` in physics logic — use `timeStateRef.current.time`
- Never pass `maxTime` to `updatePhysics` — simulation stops via `allSettled`

## R5 — Render loop reads from loopPropsRef
Any prop the rAF loop needs must be in `loopPropsRef.current` and its `useEffect` deps.

## R6 — No `useImperativeHandle` self-calls
Methods exposed via `useImperativeHandle` are for parents only — not callable from inside.

## R7 — Fix all call sites when signature changes
`updatePhysics` signature must match in: PhysicsEngine.js, MatterCanvas/index.jsx, physics.test.js

## R8 — Keep selectedObjectId and selectedObjectIds in sync
- Normal click: set both to `[id]`
- Shift+click: toggle in `selectedObjectIds`, update `selectedObjectId`
- Empty click / play: clear both