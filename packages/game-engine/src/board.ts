import { RESOURCES } from '@hextutor/shared';
import type { GameRules, BoardState, Tile } from './types';
import { createTopology } from './topology';
import { SeededRandom } from './random';
export const DEFAULT_RULES: GameRules = {
  version: 'hextutor-0.1',
  minPlayers: 3,
  maxPlayers: 4,
  victoryPointsToWin: 10,
  handLimit: 7,
  costs: {
    road: { wood: 1, brick: 1 },
    settlement: { wood: 1, brick: 1, wool: 1, grain: 1 },
    city: { grain: 2, ore: 3 },
  },
  pieceLimits: { road: 15, settlement: 5, city: 4 },
  bankSupply: 19,
  bankRatio: 4,
  portRatio: 3,
  specialPortRatio: 2,
  networkMinimum: 5,
  networkPoints: 2,
  boardGeneration: {
    radius: 2,
    resources: { wood: 4, brick: 3, wool: 4, grain: 4, ore: 3 },
    tokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  },
  probabilityModel: { sides: 6 },
};
export function generateBoard(seed: string, rules: GameRules = DEFAULT_RULES): BoardState {
  const topology = createTopology(rules.boardGeneration.radius),
    rng = new SeededRandom(`${seed}:board`);
  const resources = rng.shuffle([
    ...RESOURCES.flatMap((r) =>
      Array.from({ length: rules.boardGeneration.resources[r] }, () => r),
    ),
    null,
  ]);
  const tokens = rng.shuffle(rules.boardGeneration.tokens);
  if (
    resources.length !== Object.keys(topology.hexes).length ||
    tokens.length !== resources.length - 1
  )
    throw new Error('Board resource and token counts must fit the hex topology');
  const tiles: Record<string, Tile> = {};
  let tokenIndex = 0;
  Object.keys(topology.hexes).forEach((id, i) => {
    const resource = resources[i];
    tiles[id] = { id, resource, token: resource === null ? null : tokens[tokenIndex++] };
  });
  // Walk the coast topologically, so ports never depend on screen coordinates.
  const coast = Object.values(topology.edges).filter((e) => e.hexes.length === 1),
    ordered: typeof coast = [];
  let current = coast[0],
    vertex = current.vertices[0];
  for (let i = 0; i < coast.length; i++) {
    ordered.push(current);
    vertex = current.vertices.find((v) => v !== vertex)!;
    const next = coast.find((e) => e.id !== current.id && e.vertices.includes(vertex));
    if (!next) throw new Error('Broken coastline');
    current = next;
  }
  const portTypes = rng.shuffle([null, null, null, null, ...RESOURCES]);
  const ports = portTypes.slice(0, Math.floor(coast.length / 3)).map((resource, i) => {
    const edge =
      ordered[
        Math.floor((i * coast.length) / Math.min(portTypes.length, Math.floor(coast.length / 3)))
      ];
    return { edgeId: edge.id, vertices: edge.vertices, resource };
  });
  return { ...topology, tiles, ports };
}
