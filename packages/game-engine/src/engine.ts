import { bag, RESOURCES, sumBag, type Resource, type ResourceBag } from '@hextutor/shared';
import { DEFAULT_RULES, generateBoard } from './board';
import { SeededRandom } from './random';
import type {
  BuildType,
  GameCommand,
  GameEvent,
  GameRules,
  GameState,
  PlayerSpec,
  Result,
  StatePatch,
} from './types';
export const DEFAULT_PLAYERS: PlayerSpec[] = [
  { id: 'you', name: 'You', color: '#bf6a42', agent: 'human' },
  { id: 'sage', name: 'Sage', color: '#588c78', agent: 'heuristic' },
  { id: 'finch', name: 'Finch', color: '#d4a94e', agent: 'heuristic' },
  { id: 'river', name: 'River', color: '#688bac', agent: 'heuristic' },
];
export function createGame(
  seed = 'a-little-wiser',
  players: PlayerSpec[] = DEFAULT_PLAYERS,
  rules: GameRules = DEFAULT_RULES,
): GameState {
  if (players.length < rules.minPlayers || players.length > rules.maxPlayers)
    throw new Error('This ruleset requires 3–4 players');
  if (
    new Set(players.map((p) => p.id)).size !== players.length ||
    players.some((p) => !p.id || ['__proto__', 'constructor', 'prototype'].includes(p.id))
  )
    throw new Error('Player IDs must be unique and safe');
  if (rules.probabilityModel.sides !== 6) throw new Error('0.1 supports six-sided dice only');
  const board = generateBoard(seed, rules);
  return {
    version: 1,
    seed,
    rules: structuredClone(rules),
    rngState: new SeededRandom(`${seed}:play`).state,
    board,
    players: Object.fromEntries(players.map((p) => [p.id, { ...p, resources: bag() }])),
    order: players.map((p) => p.id),
    activePlayerId: players[0].id,
    phase: 'setup-settlement',
    turn: 0,
    setupIndex: 0,
    lastSetupVertex: null,
    buildings: {},
    roads: {},
    bank: bag(rules.bankSupply),
    blockerHexId: Object.values(board.tiles).find((t) => t.resource === null)!.id,
    dice: null,
    trade: null,
    longestNetwork: { holder: null, lengths: Object.fromEntries(players.map((p) => [p.id, 0])) },
    winner: null,
    history: [],
  };
}
export function canAfford(resources: ResourceBag, cost: Partial<ResourceBag>): boolean {
  return RESOURCES.every((r) => resources[r] >= (cost[r] ?? 0));
}
export function isSpaced(state: GameState, id: string): boolean {
  return (
    !!state.board.vertices[id] &&
    !state.buildings[id] &&
    state.board.vertices[id].neighbors.every((v) => !state.buildings[v])
  );
}
function pieceCount(state: GameState, playerId: string, type: BuildType): number {
  return type === 'road'
    ? Object.values(state.roads).filter((p) => p === playerId).length
    : Object.values(state.buildings).filter(
        (b) => b.playerId === playerId && b.level === (type === 'city' ? 2 : 1),
      ).length;
}
export function getBuildableVertices(state: GameState, playerId = state.activePlayerId): string[] {
  if (pieceCount(state, playerId, 'settlement') >= state.rules.pieceLimits.settlement) return [];
  return Object.keys(state.board.vertices).filter(
    (v) =>
      isSpaced(state, v) &&
      (state.phase === 'setup-settlement' ||
        state.board.vertices[v].edges.some((e) => state.roads[e] === playerId)),
  );
}
export function getBuildableEdges(state: GameState, playerId = state.activePlayerId): string[] {
  if (pieceCount(state, playerId, 'road') >= state.rules.pieceLimits.road) return [];
  return Object.values(state.board.edges)
    .filter(
      (e) =>
        !state.roads[e.id] &&
        (state.phase === 'setup-road'
          ? e.vertices.includes(state.lastSetupVertex!)
          : e.vertices.some((v) => {
              const b = state.buildings[v];
              return b
                ? b.playerId === playerId
                : state.board.vertices[v].edges.some((edge) => state.roads[edge] === playerId);
            })),
    )
    .map((e) => e.id);
}
export function tradeRatio(state: GameState, playerId: string, give: Resource): number {
  let ratio = state.rules.bankRatio;
  for (const port of state.board.ports)
    if (port.vertices.some((v) => state.buildings[v]?.playerId === playerId)) {
      if (port.resource === give) ratio = Math.min(ratio, state.rules.specialPortRatio);
      else if (port.resource === null) ratio = Math.min(ratio, state.rules.portRatio);
    }
  return ratio;
}
/** Longest edge-simple trail; an opponent building interrupts transit through its vertex. */
export function longestNetwork(state: GameState, playerId: string): number {
  const owned = Object.keys(state.roads).filter((e) => state.roads[e] === playerId);
  if (!owned.length) return 0;
  const walk = (vertex: string, used: Set<string>): number => {
    if (used.size && state.buildings[vertex] && state.buildings[vertex].playerId !== playerId)
      return 0;
    let best = 0;
    for (const edgeId of state.board.vertices[vertex].edges)
      if (state.roads[edgeId] === playerId && !used.has(edgeId)) {
        used.add(edgeId);
        const next = state.board.edges[edgeId].vertices.find((v) => v !== vertex)!;
        best = Math.max(best, 1 + walk(next, used));
        used.delete(edgeId);
      }
    return best;
  };
  return Math.max(
    ...[...new Set(owned.flatMap((e) => state.board.edges[e].vertices))].map((v) =>
      walk(v, new Set()),
    ),
  );
}
export function victoryPoints(state: GameState, playerId: string): number {
  return (
    Object.values(state.buildings)
      .filter((b) => b.playerId === playerId)
      .reduce((n, b) => n + b.level, 0) +
    (state.longestNetwork.holder === playerId ? state.rules.networkPoints : 0)
  );
}
function updateNetwork(state: GameState): void {
  const lengths = Object.fromEntries(state.order.map((id) => [id, longestNetwork(state, id)]));
  const max = Math.max(...Object.values(lengths));
  const leaders = state.order.filter((id) => lengths[id] === max);
  const previous = state.longestNetwork.holder;
  state.longestNetwork = {
    lengths,
    holder:
      max < state.rules.networkMinimum
        ? null
        : leaders.length === 1
          ? leaders[0]
          : previous && leaders.includes(previous)
            ? previous
            : null,
  };
}
function validate(state: GameState, c: GameCommand): string | null {
  if (!state.players[c.playerId]) return 'Unknown player';
  if (state.phase === 'finished') return 'The game is complete';
  if (c.type === 'acceptTrade' || c.type === 'rejectTrade') {
    const offer = state.trade;
    if (state.phase !== 'main' || offer?.to !== c.playerId)
      return 'There is no offer for this player';
    if (
      c.type === 'acceptTrade' &&
      (state.players[offer.from].resources[offer.give] < offer.giveAmount ||
        state.players[offer.to].resources[offer.receive] < offer.receiveAmount)
    )
      return 'The offered resources are no longer available';
    return null;
  }
  if (c.playerId !== state.activePlayerId) return 'It is not your turn';
  const resources = state.players[c.playerId].resources;
  switch (c.type) {
    case 'buildSettlement':
      return (state.phase === 'setup-settlement' || state.phase === 'main') &&
        getBuildableVertices(state).includes(c.vertexId) &&
        (state.phase === 'setup-settlement' || canAfford(resources, state.rules.costs.settlement))
        ? null
        : 'Choose a connected, unoccupied intersection at least two edges from another settlement; check your resources and pieces';
    case 'buildRoad':
      return (state.phase === 'setup-road' || state.phase === 'main') &&
        getBuildableEdges(state).includes(c.edgeId) &&
        (state.phase === 'setup-road' || canAfford(resources, state.rules.costs.road))
        ? null
        : 'Choose a free edge connected to your network; check your resources and pieces';
    case 'upgradeCity':
      return state.phase === 'main' &&
        state.buildings[c.vertexId]?.playerId === c.playerId &&
        state.buildings[c.vertexId].level === 1 &&
        pieceCount(state, c.playerId, 'city') < state.rules.pieceLimits.city &&
        canAfford(resources, state.rules.costs.city)
        ? null
        : 'Upgrade an owned settlement with two grain and three ore';
    case 'rollDice':
      return state.phase === 'roll' ? null : 'Roll only at the beginning of a turn';
    case 'moveBlocker': {
      if (
        state.phase !== 'blocker' ||
        !state.board.tiles[c.hexId] ||
        state.blockerHexId === c.hexId
      )
        return 'Move the warden to a different tile';
      if (
        c.victimId &&
        (!state.players[c.victimId] ||
          c.victimId === c.playerId ||
          !state.board.hexes[c.hexId].vertices.some(
            (v) => state.buildings[v]?.playerId === c.victimId,
          ) ||
          sumBag(state.players[c.victimId].resources) === 0)
      )
        return 'That player cannot be stolen from';
      return null;
    }
    case 'bankTrade':
      return state.phase === 'main' &&
        RESOURCES.includes(c.give) &&
        RESOURCES.includes(c.receive) &&
        c.give !== c.receive &&
        resources[c.give] >= tradeRatio(state, c.playerId, c.give) &&
        state.bank[c.receive] > 0
        ? null
        : 'Trade distinct resources with sufficient stock at the displayed rate';
    case 'proposeTrade':
      return state.phase === 'main' &&
        !state.trade &&
        !!state.players[c.to] &&
        c.to !== c.playerId &&
        RESOURCES.includes(c.give) &&
        RESOURCES.includes(c.receive) &&
        c.give !== c.receive &&
        Number.isSafeInteger(c.giveAmount) &&
        c.giveAmount > 0 &&
        Number.isSafeInteger(c.receiveAmount) &&
        c.receiveAmount > 0 &&
        resources[c.give] >= c.giveAmount &&
        state.players[c.to].resources[c.receive] >= c.receiveAmount
        ? null
        : 'Choose a player and a positive, affordable exchange; resolve any pending offer first';
    case 'endTurn':
      return state.phase === 'main' ? null : 'Finish the current phase first';
    default:
      return 'Unknown command';
  }
}
function pay(state: GameState, playerId: string, type: BuildType): void {
  for (const r of RESOURCES) {
    const amount = state.rules.costs[type][r] ?? 0;
    state.players[playerId].resources[r] -= amount;
    state.bank[r] += amount;
  }
}
function grant(state: GameState, playerId: string, resource: Resource, amount: number): void {
  const actual = Math.min(amount, state.bank[resource]);
  state.players[playerId].resources[resource] += actual;
  state.bank[resource] -= actual;
}
function distribute(state: GameState, total: number): void {
  const demand = Object.fromEntries(state.order.map((p) => [p, bag()]));
  for (const [v, b] of Object.entries(state.buildings))
    for (const id of state.board.vertices[v].hexes) {
      const tile = state.board.tiles[id];
      if (tile.resource && tile.token === total && id !== state.blockerHexId)
        demand[b.playerId][tile.resource] += b.level;
    }
  for (const r of RESOURCES) {
    const needed = state.order.reduce((n, p) => n + demand[p][r], 0);
    if (needed <= state.bank[r]) for (const p of state.order) grant(state, p, r, demand[p][r]);
  }
}
function checkWinner(state: GameState): void {
  if (
    !state.phase.startsWith('setup') &&
    victoryPoints(state, state.activePlayerId) >= state.rules.victoryPointsToWin
  ) {
    state.winner = state.activePlayerId;
    state.phase = 'finished';
    state.trade = null;
  }
}
/** Validate first, resolve seeded effects, emit a serializable event. Never mutates input. */
export function applyCommand(state: GameState, command: GameCommand): Result<GameEvent[]> {
  const error = validate(state, command);
  if (error) return { ok: false, error };
  // History and board are immutable and shared while resolving a command, avoiding quadratic cloning.
  const next: GameState = {
    ...state,
    players: structuredClone(state.players),
    bank: { ...state.bank },
    buildings: structuredClone(state.buildings),
    roads: { ...state.roads },
    longestNetwork: structuredClone(state.longestNetwork),
  };
  const c = command,
    p = c.playerId,
    rng = new SeededRandom(state.rngState),
    name = state.players[p].name;
  let message = '';
  switch (c.type) {
    case 'buildSettlement': {
      const setup = next.phase === 'setup-settlement';
      if (!setup) pay(next, p, 'settlement');
      next.buildings[c.vertexId] = { playerId: p, level: 1 };
      if (setup) {
        if (next.setupIndex >= next.order.length)
          for (const h of next.board.vertices[c.vertexId].hexes) {
            const r = next.board.tiles[h].resource;
            if (r) grant(next, p, r, 1);
          }
        next.lastSetupVertex = c.vertexId;
        next.phase = 'setup-road';
      }
      updateNetwork(next);
      message = `${name} founded a settlement`;
      break;
    }
    case 'buildRoad': {
      const setup = next.phase === 'setup-road';
      if (!setup) pay(next, p, 'road');
      next.roads[c.edgeId] = p;
      updateNetwork(next);
      if (setup) {
        next.setupIndex++;
        if (next.setupIndex === next.order.length * 2) {
          next.phase = 'roll';
          next.activePlayerId = next.order[0];
          next.turn = 1;
          next.lastSetupVertex = null;
        } else {
          const i =
            next.setupIndex < next.order.length
              ? next.setupIndex
              : next.order.length * 2 - next.setupIndex - 1;
          next.activePlayerId = next.order[i];
          next.phase = 'setup-settlement';
        }
      }
      message = `${name} built a road`;
      break;
    }
    case 'upgradeCity':
      pay(next, p, 'city');
      next.buildings[c.vertexId].level = 2;
      message = `${name} upgraded a settlement to a city`;
      break;
    case 'rollDice': {
      next.dice = [rng.int(1, 6), rng.int(1, 6)];
      const total = next.dice[0] + next.dice[1];
      next.phase = total === 7 ? 'blocker' : 'main';
      let discarded = 0;
      if (total === 7) {
        for (const id of next.order) {
          const hand = next.players[id].resources,
            totalCards = sumBag(hand);
          if (totalCards > next.rules.handLimit) {
            const count = Math.floor(totalCards / 2);
            discarded += count;
            for (let i = 0; i < count; i++) {
              const available = RESOURCES.flatMap((r) => Array.from({ length: hand[r] }, () => r));
              const r = available[rng.int(0, available.length - 1)];
              hand[r]--;
              next.bank[r]++;
            }
          }
        }
      } else distribute(next, total);
      message = `${name} rolled ${total}${discarded ? `; ${discarded} cards returned to the bank` : ''}`;
      break;
    }
    case 'moveBlocker': {
      next.blockerHexId = c.hexId;
      const victims = [
        ...new Set(
          next.board.hexes[c.hexId].vertices
            .map((v) => next.buildings[v]?.playerId)
            .filter(
              (id): id is string => !!id && id !== p && sumBag(next.players[id].resources) > 0,
            ),
        ),
      ];
      const victim =
        c.victimId ??
        victims.sort(
          (a, b) => victoryPoints(next, b) - victoryPoints(next, a) || a.localeCompare(b),
        )[0];
      if (victim) {
        const hand = next.players[victim].resources,
          available = RESOURCES.flatMap((r) => Array.from({ length: hand[r] }, () => r));
        const resource = available[rng.int(0, available.length - 1)];
        hand[resource]--;
        next.players[p].resources[resource]++;
      }
      next.phase = 'main';
      message = `${name} moved the warden${victim ? ` and took a resource from ${next.players[victim].name}` : ''}`;
      break;
    }
    case 'bankTrade': {
      const ratio = tradeRatio(next, p, c.give);
      next.players[p].resources[c.give] -= ratio;
      next.bank[c.give] += ratio;
      grant(next, p, c.receive, 1);
      message = `${name} exchanged ${ratio} ${c.give} for 1 ${c.receive}`;
      break;
    }
    case 'proposeTrade':
      next.trade = {
        from: p,
        to: c.to,
        give: c.give,
        receive: c.receive,
        giveAmount: c.giveAmount,
        receiveAmount: c.receiveAmount,
      };
      message = `${name} offered a trade to ${next.players[c.to].name}`;
      break;
    case 'acceptTrade': {
      const t = next.trade!;
      if (
        next.players[t.from].resources[t.give] < t.giveAmount ||
        next.players[t.to].resources[t.receive] < t.receiveAmount
      )
        return { ok: false, error: 'The offered resources are no longer available' };
      next.players[t.from].resources[t.give] -= t.giveAmount;
      next.players[t.to].resources[t.give] += t.giveAmount;
      next.players[t.to].resources[t.receive] -= t.receiveAmount;
      next.players[t.from].resources[t.receive] += t.receiveAmount;
      next.trade = null;
      message = `${name} accepted the trade`;
      break;
    }
    case 'rejectTrade':
      next.trade = null;
      message = `${name} declined the trade`;
      break;
    case 'endTurn':
      next.activePlayerId = next.order[(next.order.indexOf(p) + 1) % next.order.length];
      next.turn++;
      next.phase = 'roll';
      next.dice = null;
      next.trade = null;
      message = `${name} ended their turn`;
      break;
  }
  next.rngState = rng.state;
  checkWinner(next);
  const patch: StatePatch = {};
  const keys = [
    'players',
    'bank',
    'buildings',
    'roads',
    'longestNetwork',
    'activePlayerId',
    'phase',
    'turn',
    'setupIndex',
    'lastSetupVertex',
    'blockerHexId',
    'dice',
    'trade',
    'winner',
    'rngState',
  ] as const;
  for (const key of keys)
    if (JSON.stringify(state[key]) !== JSON.stringify(next[key]))
      Object.assign(patch, { [key]: next[key] });
  return {
    ok: true,
    value: [
      { id: state.history.length, type: c.type, command: structuredClone(command), message, patch },
    ],
  };
}
export function applyEvents(state: GameState, events: GameEvent[]): GameState {
  return events.reduce(
    (s, e) => ({ ...s, ...structuredClone(e.patch), history: [...s.history, structuredClone(e)] }),
    state,
  );
}
export function execute(state: GameState, command: GameCommand): GameState {
  const result = applyCommand(state, command);
  if (!result.ok) throw new Error(result.error);
  return applyEvents(state, result.value);
}
export function legalActions(state: GameState, playerId = state.activePlayerId): GameCommand[] {
  if (state.phase === 'finished' || !state.players[playerId]) return [];
  if (state.phase === 'main' && state.trade?.to === playerId)
    return [
      { type: 'acceptTrade', playerId },
      { type: 'rejectTrade', playerId },
    ].filter((c) => !validate(state, c as GameCommand)) as GameCommand[];
  if (playerId !== state.activePlayerId) return [];
  const common = { playerId },
    resources = state.players[playerId].resources;
  switch (state.phase) {
    case 'setup-settlement':
      return getBuildableVertices(state).map((vertexId) => ({
        ...common,
        type: 'buildSettlement',
        vertexId,
      }));
    case 'setup-road':
      return getBuildableEdges(state).map((edgeId) => ({ ...common, type: 'buildRoad', edgeId }));
    case 'roll':
      return [{ ...common, type: 'rollDice' }];
    case 'blocker':
      return Object.keys(state.board.hexes)
        .filter((hexId) => hexId !== state.blockerHexId)
        .map((hexId) => ({ ...common, type: 'moveBlocker', hexId }));
    case 'main': {
      const actions: GameCommand[] = [{ ...common, type: 'endTurn' }];
      if (canAfford(resources, state.rules.costs.settlement))
        actions.push(
          ...getBuildableVertices(state).map((vertexId) => ({
            ...common,
            type: 'buildSettlement' as const,
            vertexId,
          })),
        );
      if (canAfford(resources, state.rules.costs.road))
        actions.push(
          ...getBuildableEdges(state).map((edgeId) => ({
            ...common,
            type: 'buildRoad' as const,
            edgeId,
          })),
        );
      if (
        canAfford(resources, state.rules.costs.city) &&
        pieceCount(state, playerId, 'city') < state.rules.pieceLimits.city
      )
        actions.push(
          ...Object.entries(state.buildings)
            .filter(([, b]) => b.playerId === playerId && b.level === 1)
            .map(([vertexId]) => ({ ...common, type: 'upgradeCity' as const, vertexId })),
        );
      for (const give of RESOURCES)
        for (const receive of RESOURCES)
          if (
            give !== receive &&
            resources[give] >= tradeRatio(state, playerId, give) &&
            state.bank[receive] > 0
          )
            actions.push({ ...common, type: 'bankTrade', give, receive });
      // Bounded representative offers; command validation also supports arbitrary positive amounts.
      if (!state.trade)
        for (const to of state.order.filter((id) => id !== playerId))
          for (const give of RESOURCES)
            for (const receive of RESOURCES)
              if (
                give !== receive &&
                resources[give] > 0 &&
                state.players[to].resources[receive] > 0
              )
                actions.push({
                  ...common,
                  type: 'proposeTrade',
                  to,
                  give,
                  receive,
                  giveAmount: 1,
                  receiveAmount: 1,
                });
      return actions;
    }
  }
}
