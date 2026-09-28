export interface HexCoord {
  q: number;
  r: number;
}
export interface Hex extends HexCoord {
  id: string;
  vertices: string[];
  edges: string[];
}
export interface Vertex {
  id: string;
  x: number;
  y: number;
  hexes: string[];
  edges: string[];
  neighbors: string[];
}
export interface Edge {
  id: string;
  vertices: [string, string];
  hexes: string[];
}
export interface Topology {
  hexes: Record<string, Hex>;
  vertices: Record<string, Vertex>;
  edges: Record<string, Edge>;
}
const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
const CORNERS = [
  [1, -1],
  [1, 1],
  [0, 2],
  [-1, 1],
  [-1, -1],
  [0, -2],
] as const;
export const hexId = ({ q, r }: HexCoord): string => `hex:${q}:${r}`;
export const getNeighboringHexes = ({ q, r }: HexCoord): HexCoord[] =>
  DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
/** Exact integer lattice, independent of pixel geometry. Shared corners canonicalize identically. */
export function createTopology(radius = 2): Topology {
  if (!Number.isInteger(radius) || radius < 1 || radius > 5)
    throw new Error('Radius must be an integer from 1 to 5');
  const topology: Topology = { hexes: {}, vertices: {}, edges: {} };
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const id = hexId({ q, r });
      const vertices = CORNERS.map(([dx, dy]) => {
        const x = 2 * q + r + dx,
          y = 3 * r + dy,
          vid = `vertex:${x}:${y}`;
        topology.vertices[vid] ??= { id: vid, x, y, hexes: [], edges: [], neighbors: [] };
        topology.vertices[vid].hexes.push(id);
        return vid;
      });
      const edges = vertices.map((a, i) => {
        const b = vertices[(i + 1) % 6];
        const pair = [a, b].sort() as [string, string];
        const eid = `edge:${pair.join('|')}`;
        topology.edges[eid] ??= { id: eid, vertices: pair, hexes: [] };
        topology.edges[eid].hexes.push(id);
        for (const [v, n] of [
          [a, b],
          [b, a],
        ]) {
          const vertex = topology.vertices[v];
          if (!vertex.edges.includes(eid)) vertex.edges.push(eid);
          if (!vertex.neighbors.includes(n)) vertex.neighbors.push(n);
        }
        return eid;
      });
      topology.hexes[id] = { id, q, r, vertices, edges };
    }
  return topology;
}
export const getHexVertices = (t: Topology, id: string): string[] => t.hexes[id]?.vertices ?? [];
export const getVertexHexes = (t: Topology, id: string): string[] => t.vertices[id]?.hexes ?? [];
export const getAdjacentVertices = (t: Topology, id: string): string[] =>
  t.vertices[id]?.neighbors ?? [];
export const getVertexEdges = (t: Topology, id: string): string[] => t.vertices[id]?.edges ?? [];
export const getAdjacentEdges = (t: Topology, id: string): string[] =>
  [...new Set((t.edges[id]?.vertices ?? []).flatMap((v) => getVertexEdges(t, v)))].filter(
    (e) => e !== id,
  );
