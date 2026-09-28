# Validation record — Vertical Slice 0.1

Validated locally on 2026-09-28 with Node.js 22.23.1 and pnpm 8.6.2.

## Automated checks

| Check               | Result                                       |
| ------------------- | -------------------------------------------- |
| `pnpm test`         | 49 tests passed across 5 files               |
| `pnpm test:e2e`     | 5 Chromium browser tests passed              |
| `pnpm typecheck`    | Passed, strict TypeScript                    |
| `pnpm lint`         | Passed, no warnings                          |
| `pnpm format:check` | Passed                                       |
| `pnpm build`        | Passed, Vite production bundle via Turborepo |

The unit suite includes eight complete heuristic games with full replay equality and 20 randomized 200-command prefixes (4,000 random actions, including trade responses) with conservation and replay checks. Targeted regression cases cover network ties, stale trade acceptance, SVG road hit areas, and tutor-mode overlay suppression.

Browser tests exercise:

1. Hidden-by-default candidates, revealed rankings, Why explanations, keyboard placement, both setup rounds, bot actions, roll/warden flow, reload/resume, decision review and replay navigation.
2. Silent mode, three-player local pass-and-play, keyboard dialog dismissal, zoom/reset.
3. A 390 × 844 viewport with no horizontal document overflow and usable placement/road targets.
4. Switching to Silent through Settings after revealing suggestions hides those suggestions.
5. A city upgrade from a position reached through real engine commands, restored through a replay, with the expected point increase.

Chromium used an already-installed executable via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. A fresh checkout can instead install the Playwright-managed browser with `pnpm exec playwright install chromium`.

## Large simulation campaign

All commands were validated and applied through the public engine API. Each resulting state was checked for nonnegative integer resources, exact bank/player resource conservation, valid board occupancy, settlement spacing, and a winner meeting the point threshold. Games had to terminate within 5,000 commands.

| Seed range                                  | Games     | Commands      | Maximum turns | Runtime             |
| ------------------------------------------- | --------- | ------------- | ------------- | ------------------- |
| `simulation-0` through `simulation-999`     | 1,000     | 349,624       | 193           | 66.875 seconds      |
| `simulation-1000` through `simulation-2999` | 2,000     | 700,165       | 209           | 120.541 seconds     |
| Total                                       | **3,000** | **1,049,789** | **209**       | **187.416 seconds** |

All 3,000 games completed with valid winners and no invariant failures. This verifies these seed ranges and the current heuristics; it is not a proof that every possible ruleset, seed, or agent policy terminates. RandomBot is intended for fuzzing and may play poorly indefinitely; the simulation CLI intentionally uses HeuristicBot with a failure bound.

## Manual browser review

Inspected the board and opening-coach factor panel at desktop width 1440 and mobile width 390, as well as the app's default intermediate viewport. Verified original terrain icons, shared geometry, ports, readable candidate labels, selection feedback, and responsive stacking. Confirmed candidate selection and the Why breakdown through the browser accessibility controls. Temporary viewport overrides were reset after inspection.

## Limits of verification

- The GitHub Actions workflow is provided but has not run on a remote CI host in this task.
- No online multiplayer/server behavior exists to test.
- Frame-rate and input-latency targets have not been instrumented; the render layer is small, but 60/120 FPS is not a measured claim.
- Deep tutor quality and long-term learning gains need evaluation beyond deterministic heuristic correctness.
