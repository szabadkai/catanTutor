# HexTutor

A browser-based resource strategy game with an explainable opening coach. Play a complete local game against three deterministic bots, or share a device with two or three friends. Learn why an opening is useful, then revisit what you chose.

**Vertical Slice 0.1 is implemented.** This is an original prototype, with original SVG artwork and no commercial game assets or affiliation.

## Run locally

Requires Node.js 22+ and pnpm 8.6.2 (the version pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. The default is `http://127.0.0.1:5173`; Vite picks another port if it is occupied. No account, backend, API key, or AI service is required. Fonts may load from Google Fonts; system fonts provide a fallback.

## GitHub Pages

Play at [szabadkai.github.io/catanTutor](https://szabadkai.github.io/catanTutor/).

The **Verify and deploy HexTutor** workflow publishes `apps/web/dist` to GitHub Pages after formatting, lint, type, unit, browser, and simulation checks pass. Pushes to `main` deploy automatically; pull requests and other branches only run verification. You can also run the workflow manually from the Actions tab on `main`.

The repository's Pages source is **GitHub Actions**. Deployment uses GitHub's built-in token, with Pages write and OIDC permissions limited to the deployment job; no personal token or deployment secret is needed. Vite emits relative asset URLs so the app works under the repository subpath. Game saves remain in each visitor's browser.

## What you can do

- Play on a reproducible 19-tile island with 3–4 players, forward/reverse opening placement, roads, settlements, cities, dice production, a blocking warden, ports, bank and player trading, a longest-network bonus, and a ten-point finish.
- Choose **Compare three openings** to reveal candidate markers. Select an intersection, then **Why this score?** for production, diversity, scarcity, pairing, expansion, and port factors. Suggestions are hidden by default.
- Switch between Guided, Socratic, Hint, and Silent coaching.
- Inspect expected production by resource and review recorded openings in **Your learning**.
- Resume automatically after a reload. Watch replays with first/previous/play/pause/next/last and a scrubber, or export replay JSON. Restarted and completed games are archived locally (most recent 12).
- Pan and zoom the board; use Tab and Enter/Space for legal placement targets. Dialogs support keyboard navigation and Escape. Reduced motion is respected.
- Inspect seed, phase, turn, resources, events, legal actions, and serialized state in **Engine tools**. Step through legal bot actions, copy/export replays, or restart the seed.

## Verify

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm simulate --games 10000
```

Browser tests use port 5174 and can start their own Vite server. To use an existing compatible Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. `pnpm simulate --games 2000 --start-index 1000` tests a different seed range. Simulations fail on a crash, invalid resource/building state, invalid winner, or a 5,000-command termination limit.

The unit suite covers graph topology, deterministic randomness, placement legality, costs, distribution, scarcity, blocking, trades, ports, networks, victory, evaluator factors, and full replay reconstruction. Playwright covers the opening-to-turn flow, coach, bots, persistence, replays, keyboard controls, dialogs, local multiplayer selection, and mobile overflow.

## Packages

| Location               | Responsibility                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `packages/shared`      | Resource types, player IDs, tutor modes, skill taxonomy                                       |
| `packages/game-engine` | Serializable rules/state, canonical topology, RNG, commands/events, legality, economy, replay |
| `packages/game-ai`     | Random/heuristic agents and attributable action evaluations                                   |
| `packages/tutor`       | Opening ranking, decision analysis, decision records                                          |
| `packages/game-ui`     | Accessible SVG rendering and view transforms; no rules                                        |
| `packages/test-utils`  | Simulation runner and invariant assertions                                                    |
| `apps/web`             | React interface, bot scheduling, local persistence, review screens                            |

Packages expose TypeScript source to the Vite application. Turborepo orchestrates the production build; TypeScript, ESLint, Vitest, and Prettier run at workspace scope.

## Deliberate 0.1 limits

This is **local multiplayer**, not an online service. All hands are public. Discards on seven are selected automatically by seeded randomness; the warden chooses the leading eligible victim unless a command specifies one. Bots respond to player offers but do not initiate negotiations. There are no development/action cards, account system, matchmaking, or LLM evaluations.

The coach is a transparent heuristic, not a calibrated win probability or a search engine. Opening decisions are recorded; learning scores summarize those decisions within the current game. Deep counterfactual analysis, persistent cross-game skill modeling, and worker-backed search belong to later milestones. See [ROADMAP.md](ROADMAP.md).

## Design notes

See [architecture](docs/architecture.md), [game rules](docs/game-rules.md), [tutor model](docs/tutor-model.md), and [architectural decisions](docs/adr/001-vertical-slice-boundaries.md).
