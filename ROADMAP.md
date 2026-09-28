# HexTutor roadmap

## 0.1 — Playable, explainable local slice

- [x] pnpm / TypeScript / Turborepo workspace; React / Vite frontend.
- [x] Strict typechecking, ESLint, Prettier, Vitest, Playwright.
- [x] Canonical integer-lattice axial topology, shared vertices/edges, extensive adjacency tests.
- [x] Seeded RNG, procedural board, resource/token bags, coastal ports.
- [x] Engine-only command validation, resolved events, immutable reduction and deterministic replay.
- [x] Forward/reverse setup, second-placement resources, roads, settlements, city upgrades.
- [x] Turn sequence, dice distribution, bank shortages, seeded automatic discards and warden movement/theft.
- [x] Bank/port trading and offers/acceptance/rejection between players.
- [x] Piece limits, longest edge-simple road network, interruption by opponents, active-turn victory.
- [x] Deterministic random and heuristic agents; expansion paths and goal-directed bank trading.
- [x] Production per resource, legal opening ranking, optional candidate overlays, factor explanations.
- [x] Guided / Socratic / Hint / Silent modes; recorded human openings and in-game skill summaries.
- [x] Original responsive SVG island; legal click/keyboard targets, pan/zoom, probability labels, reduced motion.
- [x] 3–4 player pass-and-play and a human vs. bots mode.
- [x] Save/resume, local game archive, replay transport/scrubber, replay JSON export.
- [x] Debug inspector, legal bot-step tool, replay copy, restart by seed.
- [x] Bot simulation CLI with resource conservation, spacing and winner invariants.
- [x] Architecture, rules, tutor model, ADR, and run/verification documentation.

### Validation record

Engine and browser checks are recorded in [docs/validation.md](docs/validation.md). Frame-rate targets remain goals until instrumented profiling is completed; no 60/120 FPS claim is made by the prototype.

## 0.2 — Stronger game and analysis foundations

- [ ] Manual discard and victim selection interfaces; optional private-hand pass-and-play.
- [ ] Action/development cards and configurable alternative rulesets with compatibility fixtures.
- [ ] Dedicated semantic event payloads, runtime replay import schema, migrations, import UI.
- [ ] Full meaningful-decision records, board-linked review, counterfactual branches and mistake navigation.
- [ ] Persistent cross-game learner profile; calibrated skill scores and uncertainty from sample size.
- [ ] Opening blocking/competition evaluation and joint settlement-pair + road-direction search.
- [ ] Worker-backed analysis and simulation, measured input latency/render performance budgets.
- [ ] Seeded debug command stream for force-dice, grant-resource and phase-jump fixtures. Keep edited games clearly separate from ordinary replays.
- [ ] Improve bot negotiation and risk awareness; mixed-agent simulation campaigns.
- [ ] More accessibility auditing, larger mobile targets, touch-board usability refinement, self-hosted fonts.

## 0.3 — Connected table

- [ ] Authoritative server adapter around the engine; command sequencing, reconnection and version negotiation.
- [ ] Public/private state projections and hidden-information-safe bot/tutor boundaries.
- [ ] Friends/lobbies and asynchronous games before ratings/matchmaking.
- [ ] Persistence service and cross-device profile sync only when the local product warrants accounts.

## Beyond

- [ ] Skill-specific practice scenarios and spaced review.
- [ ] Multi-turn search and Monte Carlo counterfactuals.
- [ ] Opponent inference, table politics, threat assessment and endgame training.
- [ ] Optional natural-language rendering of structured analysis; never an LLM as the move evaluator.
