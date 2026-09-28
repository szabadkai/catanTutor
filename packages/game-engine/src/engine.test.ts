import { describe, it, expect } from 'vitest';
import { bag, RESOURCES } from '@hextutor/shared';
import {
  createGame,
  execute,
  applyCommand,
  applyEvents,
  legalActions,
  getBuildableVertices,
  getBuildableEdges,
  tradeRatio,
  longestNetwork,
  victoryPoints,
  DEFAULT_PLAYERS,
} from './engine';
import { resourceEconomy, diceProbability } from './economy';
import { exportReplay, replayGame, stateHash } from './replay';
import { DEFAULT_RULES } from './board';
import type { GameCommand, GameState } from './types';
function setup(): GameState {
  let s = createGame('test');
  while (s.phase.startsWith('setup')) s = execute(s, legalActions(s)[0]);
  return s;
}
function funded(): GameState {
  const s = setup();
  s.phase = 'main';
  s.players.you.resources = bag(5);
  for (const r of RESOURCES) s.bank[r] -= 5;
  return s;
}
function rollTotal(s: GameState, total: number): GameState {
  for (let i = 0; i < 10000; i++) {
    const test = { ...s, phase: 'roll' as const, rngState: i };
    const result = execute(test, { type: 'rollDice', playerId: test.activePlayerId });
    if (result.dice![0] + result.dice![1] === total) return result;
  }
  throw new Error('No dice seed');
}
describe('commands and setup', () => {
  it('places in forward then reverse order and grants the second placement resources', () => {
    let s = createGame('setup');
    const order: string[] = [];
    while (s.phase.startsWith('setup')) {
      if (s.phase === 'setup-settlement') order.push(s.activePlayerId);
      s = execute(s, legalActions(s)[0]);
    }
    expect(order).toEqual(['you', 'sage', 'finch', 'river', 'river', 'finch', 'sage', 'you']);
    expect(Object.keys(s.buildings)).toHaveLength(8);
    expect(Object.keys(s.roads)).toHaveLength(8);
    expect(s.phase).toBe('roll');
    expect(s.turn).toBe(1);
    for (const p of s.order)
      expect(Object.values(s.players[p].resources).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
  it('does not mutate inputs and separates events from reduction', () => {
    const s = createGame(),
      before = JSON.stringify(s);
    const result = applyCommand(s, legalActions(s)[0]);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    if (result.ok) {
      const next = applyEvents(s, result.value);
      expect(next.phase).toBe('setup-road');
      expect(next.history).toHaveLength(1);
      expect(next.buildings).not.toEqual(s.buildings);
    }
  });
  it('rejects out of turn, occupied, adjacent and non-existing intersections', () => {
    const s = createGame();
    const command = legalActions(s)[0];
    expect(applyCommand(s, { ...command, playerId: 'sage' }).ok).toBe(false);
    const next = execute(s, command);
    if (command.type !== 'buildSettlement') throw new Error('Wrong setup action');
    const v = command.vertexId;
    const again = { ...next, phase: 'setup-settlement' as const };
    for (const vertexId of [v, ...s.board.vertices[v].neighbors, 'invalid'])
      expect(applyCommand(again, { type: 'buildSettlement', playerId: 'you', vertexId }).ok).toBe(
        false,
      );
  });
  it('requires setup roads to touch the settlement just placed', () => {
    const s = execute(createGame(), legalActions(createGame())[0]);
    for (const edgeId of getBuildableEdges(s))
      expect(s.board.edges[edgeId].vertices).toContain(s.lastSetupVertex);
    const bad = Object.keys(s.board.edges).find((e) => !getBuildableEdges(s).includes(e))!;
    expect(applyCommand(s, { type: 'buildRoad', playerId: 'you', edgeId: bad }).ok).toBe(false);
  });
  it('checks costs, road connectivity and piece limits', () => {
    const s = funded(),
      edgeId = getBuildableEdges(s)[0];
    const next = execute(s, { type: 'buildRoad', playerId: 'you', edgeId });
    expect(next.players.you.resources.wood).toBe(4);
    expect(next.players.you.resources.brick).toBe(4);
    expect(next.bank.wood).toBe(s.bank.wood + 1);
    expect(applyCommand(next, { type: 'buildRoad', playerId: 'you', edgeId }).ok).toBe(false);
    s.players.you.resources = bag();
    expect(applyCommand(s, { type: 'buildRoad', playerId: 'you', edgeId }).ok).toBe(false);
    s.rules.pieceLimits.road = 2;
    expect(getBuildableEdges(s)).toHaveLength(0);
  });
  it('blocks roads from continuing through an opponent settlement', () => {
    const s = funded();
    s.roads = {};
    s.buildings = {};
    const edge = Object.values(s.board.edges).find(
      (e) => s.board.vertices[e.vertices[0]].edges.length === 3,
    )!;
    s.roads[edge.id] = 'you';
    s.buildings[edge.vertices[0]] = { playerId: 'sage', level: 1 };
    const beyond = s.board.vertices[edge.vertices[0]].edges.find((e) => e !== edge.id)!;
    expect(getBuildableEdges(s)).not.toContain(beyond);
  });
  it('requires a settlement to touch your network in main phase', () => {
    const s = funded();
    for (const v of getBuildableVertices(s))
      expect(s.board.vertices[v].edges.some((e) => s.roads[e] === 'you')).toBe(true);
  });
  it('upgrades cities, returns settlement capacity and grants points', () => {
    const s = funded(),
      v = Object.keys(s.buildings).find((v) => s.buildings[v].playerId === 'you')!;
    const next = execute(s, { type: 'upgradeCity', playerId: 'you', vertexId: v });
    expect(next.buildings[v].level).toBe(2);
    expect(next.players.you.resources.ore).toBe(2);
    expect(next.players.you.resources.grain).toBe(3);
    expect(victoryPoints(next, 'you')).toBe(3);
  });
});
describe('dice, economy and warden', () => {
  it('has a normalized exact two-dice distribution', () => {
    expect(
      Array.from({ length: 11 }, (_, i) => diceProbability(i + 2)).reduce((a, b) => a + b, 0),
    ).toBeCloseTo(1);
    expect(diceProbability(6)).toBe(5 / 36);
    expect(diceProbability(7)).toBe(6 / 36);
    expect(diceProbability(1)).toBe(0);
  });
  it('produces resources for matching rolls, doubling cities and respecting the warden', () => {
    const s = createGame();
    s.phase = 'roll';
    s.buildings = {};
    const tile = Object.values(s.board.tiles).find((t) => t.token && t.token !== 7)!;
    const vertex = s.board.hexes[tile.id].vertices[0];
    s.buildings[vertex] = { playerId: 'you', level: 2 };
    const next = rollTotal(s, tile.token!);
    expect(next.players.you.resources[tile.resource!]).toBeGreaterThanOrEqual(2);
    const blocked = rollTotal({ ...s, blockerHexId: tile.id }, tile.token!);
    expect(blocked.players.you.resources[tile.resource!]).toBe(
      next.players.you.resources[tile.resource!] - 2,
    );
  });
  it('does not favor the first player when a resource is scarce in the bank', () => {
    const s = createGame();
    s.phase = 'roll';
    const tile = Object.values(s.board.tiles).find((t) => t.resource)!;
    s.buildings = {
      [s.board.hexes[tile.id].vertices[0]]: { playerId: 'you', level: 1 },
      [s.board.hexes[tile.id].vertices[3]]: { playerId: 'sage', level: 1 },
    };
    s.bank[tile.resource!] = 1;
    const next = rollTotal(s, tile.token!);
    expect(next.players.you.resources[tile.resource!]).toBe(0);
    expect(next.players.sage.resources[tile.resource!]).toBe(0);
  });
  it('discards half of oversized hands and requires moving the warden on seven', () => {
    const s = funded();
    s.players.you.resources = bag(2);
    const next = rollTotal(s, 7);
    expect(next.phase).toBe('blocker');
    expect(Object.values(next.players.you.resources).reduce((a, b) => a + b, 0)).toBe(5);
    expect(applyCommand(next, { type: 'endTurn', playerId: 'you' }).ok).toBe(false);
    expect(
      applyCommand(next, { type: 'moveBlocker', playerId: 'you', hexId: next.blockerHexId }).ok,
    ).toBe(false);
    const moved = execute(next, legalActions(next)[0]);
    expect(moved.phase).toBe('main');
  });
  it('validates victims and steals exactly one card from an adjacent opponent', () => {
    const s = funded();
    s.phase = 'blocker';
    const v = Object.keys(s.buildings).find((v) => s.buildings[v].playerId === 'sage')!;
    const h = s.board.vertices[v].hexes.find((h) => h !== s.blockerHexId)!;
    s.players.sage.resources = bag(1);
    const before = Object.values(s.players.you.resources).reduce((a, b) => a + b, 0);
    expect(
      applyCommand(s, { type: 'moveBlocker', playerId: 'you', hexId: h, victimId: 'you' }).ok,
    ).toBe(false);
    const next = execute(s, { type: 'moveBlocker', playerId: 'you', hexId: h, victimId: 'sage' });
    expect(Object.values(next.players.you.resources).reduce((a, b) => a + b, 0)).toBe(before + 1);
    expect(Object.values(next.players.sage.resources).reduce((a, b) => a + b, 0)).toBe(4);
  });
  it('reports expected production per roll and per turn consistently', () => {
    const s = setup(),
      e = resourceEconomy(s, 'you');
    expect(e.totalProduction).toBeGreaterThan(0);
    expect(e.expectedPerRoll).toEqual(e.expectedPerTurn);
    expect(e.diversity).toBeGreaterThan(0);
  });
});
describe('trading, networks and victory', () => {
  it('uses 4:1 bank, 3:1 general port and 2:1 specialized ports', () => {
    const s = funded();
    s.buildings = {};
    expect(tradeRatio(s, 'you', 'wood')).toBe(4);
    const general = s.board.ports.find((p) => p.resource === null)!;
    s.buildings[general.vertices[0]] = { playerId: 'you', level: 1 };
    expect(tradeRatio(s, 'you', 'wood')).toBe(3);
    const special = s.board.ports.find((p) => p.resource === 'wood')!;
    s.buildings[special.vertices[0]] = { playerId: 'you', level: 1 };
    expect(tradeRatio(s, 'you', 'wood')).toBe(2);
    const next = execute(s, { type: 'bankTrade', playerId: 'you', give: 'wood', receive: 'ore' });
    expect(next.players.you.resources.wood).toBe(3);
    expect(next.players.you.resources.ore).toBe(6);
  });
  it('rejects empty bank and invalid exchange types', () => {
    const s = funded();
    s.bank.ore = 0;
    expect(
      applyCommand(s, { type: 'bankTrade', playerId: 'you', give: 'wood', receive: 'ore' }).ok,
    ).toBe(false);
    expect(
      applyCommand(s, { type: 'bankTrade', playerId: 'you', give: 'wood', receive: 'wood' }).ok,
    ).toBe(false);
  });
  it('validates, accepts and rejects player trades without changing whose turn it is', () => {
    const s = funded();
    s.players.sage.resources = bag(2);
    const offer: GameCommand = {
      type: 'proposeTrade',
      playerId: 'you',
      to: 'sage',
      give: 'wood',
      receive: 'ore',
      giveAmount: 2,
      receiveAmount: 1,
    };
    expect(applyCommand(s, { ...offer, giveAmount: -1 }).ok).toBe(false);
    expect(applyCommand(s, { ...offer, giveAmount: NaN }).ok).toBe(false);
    const proposed = execute(s, offer);
    expect(applyCommand(proposed, { type: 'acceptTrade', playerId: 'finch' }).ok).toBe(false);
    const accepted = execute(proposed, { type: 'acceptTrade', playerId: 'sage' });
    expect(accepted.players.you.resources.wood).toBe(3);
    expect(accepted.players.you.resources.ore).toBe(6);
    expect(accepted.activePlayerId).toBe('you');
    expect(accepted.trade).toBeNull();
    expect(execute(proposed, { type: 'rejectTrade', playerId: 'sage' }).trade).toBeNull();
  });
  it('handles branches, cycles and blocking without counting roads twice', () => {
    const s = createGame();
    const hex = Object.values(s.board.hexes)[0];
    for (const e of hex.edges) s.roads[e] = 'you';
    expect(longestNetwork(s, 'you')).toBe(6);
    s.buildings[hex.vertices[0]] = { playerId: 'sage', level: 1 };
    expect(longestNetwork(s, 'you')).toBe(6);
    s.buildings[hex.vertices[3]] = { playerId: 'finch', level: 1 };
    expect(longestNetwork(s, 'you')).toBe(3);
    s.roads = {};
    s.buildings = {};
    const center = Object.values(s.board.vertices).find((v) => v.edges.length === 3)!;
    for (const e of center.edges) s.roads[e] = 'you';
    expect(longestNetwork(s, 'you')).toBe(2);
  });
  it('finishes at a configurable victory threshold and rejects later actions', () => {
    const rules = { ...DEFAULT_RULES, victoryPointsToWin: 3 };
    let s = createGame('win', DEFAULT_PLAYERS, rules);
    while (s.phase.startsWith('setup')) s = execute(s, legalActions(s)[0]);
    s.phase = 'main';
    s.players.you.resources = bag(5);
    const v = Object.keys(s.buildings).find((v) => s.buildings[v].playerId === 'you')!;
    s = execute(s, { type: 'upgradeCity', playerId: 'you', vertexId: v });
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('you');
    expect(legalActions(s)).toHaveLength(0);
    expect(applyCommand(s, { type: 'endTurn', playerId: 'you' }).ok).toBe(false);
  });
});
describe('replay determinism', () => {
  it('reconstructs every prefix and subsequent random results', () => {
    let s = setup();
    for (let i = 0; i < 30; i++) {
      const actions = legalActions(s);
      const c = actions.find((a) => a.type === 'endTurn') ?? actions[0];
      s = execute(s, c);
    }
    const replay = exportReplay(s);
    expect(replayGame(replay)).toEqual(s);
    expect(stateHash(replayGame(JSON.parse(JSON.stringify(replay))))).toBe(stateHash(s));
    for (const count of [0, 1, 8, 16, 25])
      expect(replayGame(replay, count).history).toHaveLength(count);
    expect(() => replayGame(replay, -1)).toThrow();
  });
});

describe('network and trade regressions', () => {
  it('keeps the current network holder on a tie, then transfers a strictly longer network', () => {
    const s = funded();
    s.roads = {};
    s.buildings = {};
    const hexes = Object.values(s.board.hexes),
      a = hexes[0],
      b = hexes.at(-1)!;
    for (const e of a.edges.slice(0, 4)) s.roads[e] = 'you';
    for (const e of b.edges.slice(0, 5)) s.roads[e] = 'sage';
    s.longestNetwork.holder = 'sage';
    const tied = execute(s, { type: 'buildRoad', playerId: 'you', edgeId: a.edges[4] });
    expect(tied.longestNetwork.lengths.you).toBe(5);
    expect(tied.longestNetwork.holder).toBe('sage');
    const longer = execute(tied, { type: 'buildRoad', playerId: 'you', edgeId: a.edges[5] });
    expect(longer.longestNetwork.holder).toBe('you');
    expect(victoryPoints(longer, 'you')).toBe(DEFAULT_RULES.networkPoints);
  });
  it('removes an unaffordable pending acceptance from legal actions without partial transfers', () => {
    const s = funded();
    s.players.sage.resources = bag(2);
    const offered = execute(s, {
      type: 'proposeTrade',
      playerId: 'you',
      to: 'sage',
      give: 'wood',
      receive: 'ore',
      giveAmount: 5,
      receiveAmount: 1,
    });
    const spent = execute(offered, {
      type: 'buildRoad',
      playerId: 'you',
      edgeId: getBuildableEdges(offered)[0],
    });
    expect(legalActions(spent, 'sage')).toEqual([{ type: 'rejectTrade', playerId: 'sage' }]);
    const before = JSON.stringify(spent);
    expect(applyCommand(spent, { type: 'acceptTrade', playerId: 'sage' }).ok).toBe(false);
    expect(JSON.stringify(spent)).toBe(before);
  });
});
