# Architecture

## Boundary and dependency direction

```text
shared ← game-engine ← game-ai ← tutor
             ↑
           game-ui
             ↑
       apps/web (also uses game-ai and tutor)
```

The engine has no React, browser, networking, persistence, tutor, or rendering dependency. It takes serializable state and typed commands. RNG state is part of the authoritative position. React only selects legal commands, displays results, and schedules agents.

### Command lifecycle

1. `applyCommand(state, command)` validates actor, phase, location, connections, stock, costs, and limits.
2. It resolves any dice, discard, or theft randomness using the state's seeded RNG cursor.
3. It emits a resolved event containing the command, a log message, and an authoritative patch of changed state fields. Rejected commands emit no events.
4. `applyEvents` immutably applies those patches and appends them to history.
5. `execute` combines the two steps for simulations and reconstruction.

Patches in 0.1 are versioned resolved events, not UI state. They intentionally trade semantic granularity for simple deterministic reconstruction. The board and rules remain immutable; changed mutable sections are cloned. No snapshot contains React objects, Date instances, Maps, Sets, or functions. Events themselves are not accepted from untrusted clients. A future server must validate intentions with `applyCommand` and send only its authoritative events.

Replays store engine/ruleset versions, complete rules, player specifications, seed, and command sequence. `at` is a logical command index in 0.1, not wall-clock time. Playback reconstructs from the initial state. RNG snapshots never depend on animation timing, bot delays, or system time. `stateHash` is a fast non-cryptographic debugging fingerprint, not an authentication mechanism.

## Geometry

Hexes use axial `(q,r)` coordinates. A tile center maps to integer lattice `(2q+r,3r)`; six fixed integer offsets describe its vertices. Equal corners canonicalize to the same `vertex:x:y`. Edges sort their endpoint IDs before forming a canonical ID. Board logic operates on this graph. Screen coordinates are computed only by the SVG renderer.

At radius two the island contains 19 hexes, 54 vertices, 72 edges and 30 coastal edges. A coast walk places nine ports without overlapping endpoint pairs. Terrain and probability-token bags are shuffled separately with a seed-derived RNG. High-probability adjacent tiles are allowed; the opening coach evaluates the island that was actually generated.

## Rules and agents

Costs, piece caps, bank supply, victory threshold, hand limit, network scoring, trading ratios, resource/token bags and radius live in `GameRules`. Resource identity is a fixed five-member union in 0.1. Six-sided dice are explicitly enforced. Changing radius requires a matching bag of resources/tokens.

`legalActions` enumerates valid build/phase/bank actions and bounded 1:1 player offers. The validator also accepts arbitrary positive, affordable exchange amounts. UI trade forms construct those commands and use the same validator. Offers may become unaffordable if the proposer spends cards; acceptance rechecks stock.

Agents receive the position and legal action set. The heuristic evaluates placement factors, production upgrades, shortest legal expansion paths, construction-goal bank trades and warden effects. Ties are stable. RandomBot derives a choice stream from seed, event count and RNG cursor. Agents are independent from the React timer that invokes them.

`PublicGameState` is currently an alias for `GameState` because 0.1 intentionally uses open hands. Do not use that alias as a privacy boundary for future online games; implement a projection before adding hidden information or networking.

## Browser application

React owns interface preferences, current selection, view/dialog state and playback position. The memoized SVG board has original resource art, accessible legal targets, and local pan/zoom state. The UI never grants resources or mutates rules. City/road/settlement buttons filter the engine's action list. Confirming a selection dispatches the same command shape used by bots and replays.

Tutor ranking for a 54-vertex opening is synchronous and memoized. Large simulation/search work is not invoked in the browser. The CLI drives complete games outside rendering; worker execution and profiling are scheduled for 0.2.

Native HTML dialogs handle modal focus and Escape. Every resource has a name/symbol as well as a color. Candidates carry letter labels. Browser zoom scales text; `prefers-reduced-motion` disables transitions. Touch/pointer panning is scoped to the board, and targets use explicit hit geometry.

## Persistence

`localStorage` stores versioned settings, the current replay plus decision records, and the 12 most recent archived games. Persisting command streams instead of trusting arbitrary saved state checks legality when resuming. Completed/restarted games are archived. JSON export provides an escape hatch if storage is unavailable. No state is transmitted to a service.

Current limitations: no schema-validated external import, no migrations beyond a hard version check, no cross-device sync, and no durable cross-game skill model. See the roadmap before expanding these boundaries.
