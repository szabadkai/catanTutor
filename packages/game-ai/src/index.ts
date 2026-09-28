import { RESOURCES, RESOURCE_LABELS, type ResourceBag, type TutorConcept } from '@hextutor/shared';
import {
  SeededRandom,
  vertexProduction,
  resourceEconomy,
  diceProbability,
  isSpaced,
  getBuildableVertices,
  tradeRatio,
  victoryPoints,
  type GameState,
  type GameCommand,
  type PublicGameState,
  type BuildType,
} from '@hextutor/game-engine';
export interface EvaluationFactor {
  type: TutorConcept;
  value: number;
  explanation: string;
}
export interface EvaluatedAction {
  action: GameCommand;
  evaluation: number;
  factors: EvaluationFactor[];
}
export interface PlacementEvaluation extends EvaluatedAction {
  production: ResourceBag;
  coverage: number;
}
export interface PlayerAgent {
  chooseAction(state: PublicGameState, legalActions: GameCommand[]): Promise<GameCommand>;
}
export function evaluatePlacement(
  state: GameState,
  vertexId: string,
  playerId = state.activePlayerId,
): PlacementEvaluation {
  const production = vertexProduction(state, vertexId, true),
    economy = resourceEconomy(state, playerId);
  const total = RESOURCES.reduce((n, r) => n + production[r], 0),
    coverage = RESOURCES.filter((r) => production[r] > 0).length;
  const fresh = RESOURCES.filter((r) => production[r] > 0 && economy.expectedPerRoll[r] === 0);
  const supply = Object.fromEntries(
    RESOURCES.map((r) => [
      r,
      Object.values(state.board.tiles)
        .filter((t) => t.resource === r)
        .reduce((n, t) => n + diceProbability(t.token ?? 0), 0),
    ]),
  ) as ResourceBag;
  const scarcity = RESOURCES.reduce((n, r) => n + (supply[r] ? production[r] / supply[r] : 0), 0);
  const neighbors = state.board.vertices[vertexId].neighbors;
  const expansion = [
    ...new Set(neighbors.flatMap((v) => state.board.vertices[v].neighbors)),
  ].filter((v) => v !== vertexId && isSpaced(state, v)).length;
  const port = state.board.ports.find((p) => p.vertices.includes(vertexId));
  const factors: EvaluationFactor[] = [
    {
      type: 'production',
      value: total * 100,
      explanation: `Produces ${total.toFixed(2)} resources per roll before blocking. Probability matters more than a single high token.`,
    },
    {
      type: 'resource-diversity',
      value: coverage * 5,
      explanation: `Touches ${coverage} resource ${coverage === 1 ? 'type' : 'types'}: ${
        RESOURCES.filter((r) => production[r] > 0)
          .map((r) => RESOURCE_LABELS[r])
          .join(', ') || 'none'
      }.`,
    },
    {
      type: 'opening-placement',
      value: fresh.length * 5,
      explanation: fresh.length
        ? `Adds ${fresh.map((r) => RESOURCE_LABELS[r]).join(', ')} to your current production coverage.`
        : 'Overlaps your existing resources; weigh volume against dependence on trades.',
    },
    {
      type: 'scarcity',
      value: scarcity * 12,
      explanation:
        'Rewards access to resources with less total production on this particular island.',
    },
    {
      type: 'expansion',
      value: Math.min(6, expansion) * 1.5,
      explanation: `${expansion} currently open intersections within two roads. Opponents may close these routes.`,
    },
    {
      type: 'ports',
      value: port ? 5 : 0,
      explanation: port
        ? `Direct access to a ${port.resource ? RESOURCE_LABELS[port.resource] + ' 2:1' : 'general 3:1'} port.`
        : 'No immediate port access. Build toward the coast if you develop a surplus.',
    },
  ];
  return {
    action: { type: 'buildSettlement', playerId, vertexId },
    evaluation: Math.min(100, Math.round(factors.reduce((n, f) => n + f.value, 0))),
    factors,
    production,
    coverage,
  };
}
/** Multi-source shortest expansion paths across legal, unoccupied edges. */
function expansionPlan(
  state: GameState,
  playerId: string,
): { path: string[]; score: number } | null {
  const starts = new Set(
    Object.entries(state.buildings)
      .filter(([, b]) => b.playerId === playerId)
      .map(([v]) => v),
  );
  for (const [e, p] of Object.entries(state.roads))
    if (p === playerId)
      for (const v of state.board.edges[e].vertices)
        if (!state.buildings[v] || state.buildings[v].playerId === playerId) starts.add(v);
  const distance = new Map<string, number>(),
    paths = new Map<string, string[]>(),
    queue = [...starts];
  for (const v of starts) {
    distance.set(v, 0);
    paths.set(v, []);
  }
  while (queue.length) {
    queue.sort((a, b) => distance.get(a)! - distance.get(b)!);
    const v = queue.shift()!;
    for (const e of state.board.vertices[v].edges) {
      if (state.roads[e] && state.roads[e] !== playerId) continue;
      const other = state.board.edges[e].vertices.find((x) => x !== v)!;
      if (state.buildings[other] && state.buildings[other].playerId !== playerId) continue;
      const cost = state.roads[e] === playerId ? 0 : 1,
        next = distance.get(v)! + cost;
      if (next < (distance.get(other) ?? Infinity)) {
        distance.set(other, next);
        paths.set(other, cost ? [...paths.get(v)!, e] : paths.get(v)!);
        if (!queue.includes(other)) queue.push(other);
      }
    }
  }
  const remaining =
    state.rules.pieceLimits.road - Object.values(state.roads).filter((p) => p === playerId).length;
  return (
    [...distance.entries()]
      .filter(([v, d]) => d > 0 && d <= remaining && isSpaced(state, v))
      .map(([v, d]) => ({
        path: paths.get(v)!,
        score: evaluatePlacement(state, v, playerId).evaluation / Math.pow(d + 1, 1.3),
      }))
      .sort((a, b) => b.score - a.score)[0] ?? null
  );
}
function buildGoal(state: GameState, playerId: string): BuildType {
  const hand = state.players[playerId].resources;
  const settlements = Object.values(state.buildings).filter(
    (b) => b.playerId === playerId && b.level === 1,
  ).length;
  const cities = Object.values(state.buildings).filter(
    (b) => b.playerId === playerId && b.level === 2,
  ).length;
  if (
    settlements > 0 &&
    cities < state.rules.pieceLimits.city &&
    (hand.ore >= 2 ||
      (!getBuildableVertices(state, playerId).length &&
        Object.values(state.roads).filter((p) => p === playerId).length >=
          state.rules.pieceLimits.road))
  )
    return 'city';
  if (getBuildableVertices(state, playerId).length) return 'settlement';
  if (expansionPlan(state, playerId)) return 'road';
  return 'city';
}
export function evaluateAction(state: GameState, action: GameCommand): EvaluatedAction {
  const playerId = action.playerId;
  if (action.type === 'buildSettlement') return evaluatePlacement(state, action.vertexId, playerId);
  let evaluation = 0,
    factor: EvaluationFactor = {
      type: 'tempo',
      value: 0,
      explanation: 'Pass with your current resources to begin the next turn.',
    };
  switch (action.type) {
    case 'upgradeCity':
      evaluation =
        85 + RESOURCES.reduce((n, r) => n + vertexProduction(state, action.vertexId)[r] * 20, 0);
      factor = {
        type: 'production',
        value: evaluation,
        explanation: 'Doubles this settlement’s production and adds a victory point.',
      };
      break;
    case 'buildRoad': {
      if (state.phase === 'setup-road') {
        const origin = state.lastSetupVertex!;
        const end = state.board.edges[action.edgeId].vertices.find((v) => v !== origin)!;
        const targets = state.board.vertices[end].neighbors.filter(
          (v) => v !== origin && isSpaced(state, v),
        );
        evaluation = targets.length
          ? Math.max(...targets.map((v) => evaluatePlacement(state, v, playerId).evaluation))
          : 1;
      } else {
        const plan = expansionPlan(state, playerId);
        evaluation = plan?.path[0] === action.edgeId ? 35 + plan.score : -5;
      }
      factor = {
        type: 'road-planning',
        value: evaluation,
        explanation:
          'Favors the first road on a short route to a productive, legal future settlement.',
      };
      break;
    }
    case 'bankTrade': {
      const goal = buildGoal(state, playerId),
        cost = state.rules.costs[goal],
        hand = state.players[playerId].resources,
        ratio = tradeRatio(state, playerId, action.give);
      evaluation =
        hand[action.receive] < (cost[action.receive] ?? 0) &&
        hand[action.give] - ratio >= (cost[action.give] ?? 0)
          ? 20
          : -10;
      factor = {
        type: 'trading',
        value: evaluation,
        explanation: `Trades a surplus toward the next ${goal}, preserving resources already needed for its cost.`,
      };
      break;
    }
    case 'moveBlocker': {
      evaluation =
        state.board.hexes[action.hexId].vertices.reduce((n, v) => {
          const b = state.buildings[v];
          return (
            n +
            (b
              ? (b.playerId === playerId ? -5 : 1 + victoryPoints(state, b.playerId) / 4) * b.level
              : 0)
          );
        }, 0) *
        diceProbability(state.board.tiles[action.hexId].token ?? 0) *
        40;
      factor = {
        type: 'blocking',
        value: evaluation,
        explanation:
          'Weighs lost opponent production and their points against damage to your own economy.',
      };
      break;
    }
    case 'acceptTrade': {
      const t = state.trade!;
      evaluation =
        (state.players[playerId].resources[t.give] === 0 ? 8 : 2) * t.giveAmount -
        t.receiveAmount * 3;
      factor = {
        type: 'trading',
        value: evaluation,
        explanation:
          'Favors filling a missing resource without giving away disproportionate value.',
      };
      break;
    }
    case 'rejectTrade':
      evaluation = 0;
      break;
    case 'proposeTrade':
      evaluation = -20;
      break;
    case 'rollDice':
      evaluation = 1;
      break;
    case 'endTurn':
      evaluation = 0;
      break;
  }
  return { action, evaluation, factors: [factor] };
}
export function chooseHeuristicAction(state: GameState, actions: GameCommand[]): GameCommand {
  if (!actions.length) throw new Error('No legal actions');
  return actions
    .map((action) => evaluateAction(state, action))
    .sort(
      (a, b) =>
        b.evaluation - a.evaluation ||
        JSON.stringify(a.action).localeCompare(JSON.stringify(b.action)),
    )[0].action;
}
export class HeuristicBot implements PlayerAgent {
  async chooseAction(state: PublicGameState, actions: GameCommand[]): Promise<GameCommand> {
    return chooseHeuristicAction(state, actions);
  }
}
export class RandomBot implements PlayerAgent {
  async chooseAction(state: PublicGameState, actions: GameCommand[]): Promise<GameCommand> {
    if (!actions.length) throw new Error('No legal actions');
    const rng = new SeededRandom(`${state.seed}:bot:${state.history.length}:${state.rngState}`);
    return actions[rng.int(0, actions.length - 1)];
  }
}
