# ADR 001 — Local deterministic slice before infrastructure

Status: accepted for 0.1.

## Decisions

1. **SVG before PixiJS.** Nineteen tiles and 54 intersections are a small scene. SVG offers inspectable geometry, text, explicit hit regions and keyboard focus without a second renderer. Rules remain renderer-independent. Move to Pixi only after profiling provides a reason.
2. **Integer lattice topology.** Canonical IDs derive from exact axial geometry, never floating-point pixels. Rendering converts lattice coordinates at the boundary.
3. **Seed plus command stream.** Seeded board generation and serialized play-RNG cursors make outcomes independent of UI timing. Replay reconstructs from rules, players, seed and intentions.
4. **Resolved patch events first.** One validated command produces a versioned event with changed authoritative fields. It is easy to reduce and inspect. Split into semantic domain events when networking or event analytics justify migration complexity.
5. **Open-hand local practice.** Local bots and pass-and-play provide complete games without premature infrastructure. Explicitly do not treat the current `PublicGameState` alias as a secrecy guarantee.
6. **Automatic seeded discards/victim default.** This keeps the first seven-roll flow small and replayable. Document the behavior in the game guide. Manual choice UI is scheduled for 0.2.
7. **Heuristics, not opaque AI judgments.** Evaluations preserve weighted factors and limitations. No API key or language model is required.
8. **Small synchronous opening evaluation.** A 54-node graph is bounded. Batch simulations run in a CLI; worker-backed search follows with heavier analysis. Do not claim measured 60/120 FPS without profiling.
9. **No invalid debug mutations.** The first inspector steps legal actions. Force-dice/grants/phase jumps require an explicitly marked debug command stream before they can coexist with correct replay.
10. **No premature accounts.** Browser-local command/replay storage is sufficient for the vertical slice. Archive retention is explicitly bounded at 12 games.

## Consequences

The first product is usable end-to-end and testable without networking. Online play requires a server adapter, runtime command validation and private state projections. Heuristic scores and in-game skill summaries must remain visibly modest claims. Replay schema, debug commands and event migrations need versioned compatibility tests before their next evolution.
