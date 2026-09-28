import { bag, RESOURCES, type ResourceBag } from '@hextutor/shared';
import type { GameState } from './types';
export function diceProbability(total: number, sides = 6): number {
  return total >= 2 && total <= 2 * sides
    ? (sides - Math.abs(sides + 1 - total)) / (sides * sides)
    : 0;
}
export interface ResourceEconomy {
  expectedPerRoll: ResourceBag;
  expectedPerTurn: ResourceBag;
  totalProduction: number;
  diversity: number;
  scarcityExposure: number;
}
export function vertexProduction(
  state: GameState,
  vertexId: string,
  ignoreBlocker = false,
): ResourceBag {
  const result = bag();
  for (const id of state.board.vertices[vertexId]?.hexes ?? []) {
    const tile = state.board.tiles[id];
    if (tile.resource && tile.token && (ignoreBlocker || id !== state.blockerHexId))
      result[tile.resource] += diceProbability(tile.token, state.rules.probabilityModel.sides);
  }
  return result;
}
export function resourceEconomy(state: GameState, playerId: string): ResourceEconomy {
  const expectedPerRoll = bag();
  for (const [id, b] of Object.entries(state.buildings))
    if (b.playerId === playerId) {
      const p = vertexProduction(state, id);
      for (const r of RESOURCES) expectedPerRoll[r] += p[r] * b.level;
    }
  const diversity = RESOURCES.filter((r) => expectedPerRoll[r] > 0).length;
  // A turn contains one roll. A round contains one turn for each player.
  return {
    expectedPerRoll,
    expectedPerTurn: { ...expectedPerRoll },
    totalProduction: RESOURCES.reduce((n, r) => n + expectedPerRoll[r], 0),
    diversity,
    scarcityExposure: (RESOURCES.length - diversity) / RESOURCES.length,
  };
}
