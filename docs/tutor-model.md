# Explainable opening coach

The tutor does not ask a language model whether a move is good. It consumes engine-legal candidate commands and attributable heuristic evaluations from `game-ai`. Its numeric score is a comparison aid, not a probability of winning.

## Position features

For each productive hex, the exact two-dice probability is `(6 - |7 - token|) / 36`. Sum the probabilities at an intersection into five resource buckets. A city's contribution is doubled; a blocked tile contributes zero to a live player's economy. Opening evaluations ignore temporary blocking, since the initial warden is on the barren tile.

`ResourceEconomy` exposes expected production per roll and per turn, total production, number of resource types produced, and the fraction of resource types missing. Each turn contains one roll, so per-turn and per-roll expectations are equal. Multiply by player count for a full table round. These are steady-state expectations, not promises, and they ignore finite-bank stock.

## Opening score

The current formula sums these transparent contributions and caps the total at 100:

| Factor             | Contribution                                                 | Interpretation                          |
| ------------------ | ------------------------------------------------------------ | --------------------------------------- |
| Production         | 100 × expected cards per roll                                | More frequent aggregate income          |
| Resource diversity | 5 × distinct adjacent resource types                         | Useful coverage rather than color alone |
| Opening synergy    | 5 × resource types absent from existing production           | A second placement can fill a gap       |
| Scarcity           | 12 × sum of local production / island production by resource | Access to locally scarce income         |
| Expansion          | 1.5 × up to six currently legal two-edge destinations        | Room to grow; opponents may take it     |
| Ports              | 5 for an immediately accessible port                         | Future surplus flexibility              |

Each contribution includes a readable explanation and its raw value. These weights are intentionally simple and uncalibrated. They do not account for opponent negotiation, joint pair search, a port's full resource synergy, or search-based blocking value. Road direction is evaluated separately by the bot using legal future settlement paths. The opening UI must not imply these future features are already part of its score.

## Modes

- **Guided:** contextual advice; candidates remain hidden until the player asks to compare. Selecting a location enables its score, resource production and an optional Why breakdown.
- **Socratic:** asks a resource-pairing question before revealing comparisons. Feedback explains context rather than teaching a universal placement recipe.
- **Hint:** a strategic nudge only; no numeric recommendation or candidate overlay.
- **Silent:** no live recommendation; choices are still recorded for review.

Changing to Hint or Silent suppresses candidate overlays even if they were previously requested.

## Decision records

Every human opening settlement captures its chosen command, legal alternatives, pre-move state hash, turn, actor, and analysis. Best candidate minus chosen score determines quality: at most 3 = excellent, 10 = good, 20 = inaccuracy, 30 = mistake, otherwise major mistake. The strongest three alternatives are retained. Confidence is a fixed moderate 0.65 indicator of heuristic uncertainty, not statistical calibration.

Concepts come from the underlying factors. The current skill summary maps relative score gap to `clamp(1 - gap/100, 0, 1)` for each affected concept, then averages within the game's records. Unobserved taxonomy entries remain unscored. This is a prototype feedback signal, not an independently measured proficiency score. Archived games retain their own records; aggregation and a persistent learner model are future work.

## Next analysis boundary

Extend feature extraction and evaluation before adding prose generation. Add all meaningful decision records, opponent competition, joint opening pair search, counterfactual branching, uncertainty from sample count, and targeted practice. Heavy search should run behind the existing analyzer interface in a worker. An optional language layer may explain these structured factors later, but it must not invent evaluations or certainty.
