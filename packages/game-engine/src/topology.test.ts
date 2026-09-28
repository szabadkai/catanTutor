import { describe, it, expect } from 'vitest';
import {
  createTopology,
  getNeighboringHexes,
  getAdjacentEdges,
  getAdjacentVertices,
  getVertexEdges,
  getVertexHexes,
  getHexVertices,
  hexId,
} from './topology';
import { generateBoard } from './board';
import { SeededRandom } from './random';
describe('canonical hex topology', () => {
  const t = createTopology();
  it('has 19 tiles, 54 unique corners and 72 unique edges', () => {
    expect(Object.keys(t.hexes)).toHaveLength(19);
    expect(Object.keys(t.vertices)).toHaveLength(54);
    expect(Object.keys(t.edges)).toHaveLength(72);
  });
  it('satisfies Euler’s planar identity', () =>
    expect(
      Object.keys(t.vertices).length - Object.keys(t.edges).length + Object.keys(t.hexes).length,
    ).toBe(1));
  it('shares exactly two corners and one edge with each neighboring tile', () => {
    for (const h of Object.values(t.hexes))
      for (const coord of getNeighboringHexes(h)) {
        const other = t.hexes[hexId(coord)];
        if (other) {
          expect(h.vertices.filter((v) => other.vertices.includes(v))).toHaveLength(2);
          expect(h.edges.filter((e) => other.edges.includes(e))).toHaveLength(1);
        }
      }
  });
  it('has reciprocal adjacency and exact integer corner coordinates', () => {
    for (const v of Object.values(t.vertices)) {
      expect(Number.isInteger(v.x) && Number.isInteger(v.y)).toBe(true);
      expect(v.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(v.neighbors.length).toBeLessThanOrEqual(3);
      for (const n of getAdjacentVertices(t, v.id)) expect(t.vertices[n].neighbors).toContain(v.id);
      for (const e of getVertexEdges(t, v.id)) expect(t.edges[e].vertices).toContain(v.id);
      for (const h of getVertexHexes(t, v.id)) expect(getHexVertices(t, h)).toContain(v.id);
    }
  });
  it('has 30 coastline edges and all other edges are shared twice', () => {
    expect(Object.values(t.edges).filter((e) => e.hexes.length === 1)).toHaveLength(30);
    for (const e of Object.values(t.edges)) {
      expect([1, 2]).toContain(e.hexes.length);
      expect(getAdjacentEdges(t, e.id)).not.toContain(e.id);
      for (const n of getAdjacentEdges(t, e.id)) expect(getAdjacentEdges(t, n)).toContain(e.id);
    }
  });
  it.each([1, 2, 3, 4, 5])('supports radius %i', (r) => {
    const b = createTopology(r);
    expect(Object.keys(b.hexes)).toHaveLength(1 + 3 * r * (r + 1));
    expect(
      Object.keys(b.vertices).length - Object.keys(b.edges).length + Object.keys(b.hexes).length,
    ).toBe(1);
  });
});
describe('seeded generation', () => {
  it('reproduces identical streams and shuffles without mutating inputs', () => {
    const a = new SeededRandom('test'),
      b = new SeededRandom('test'),
      values = [1, 2, 3, 4, 5];
    expect(a.shuffle(values)).toEqual(b.shuffle(values));
    expect(values).toEqual([1, 2, 3, 4, 5]);
    expect(Array.from({ length: 100 }, () => a.next())).toEqual(
      Array.from({ length: 100 }, () => b.next()),
    );
  });
  it('can resume from its serialized cursor', () => {
    const a = new SeededRandom('resume');
    a.next();
    const b = new SeededRandom(a.state);
    expect(a.next()).toBe(b.next());
  });
  it('has bounded inclusive integers and checks invalid ranges', () => {
    const r = new SeededRandom('range');
    const results = Array.from({ length: 1000 }, () => r.int(1, 6));
    expect(new Set(results)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(() => r.int(5, 4)).toThrow();
  });
  it('reproduces a board while different seeds change it', () => {
    expect(generateBoard('one')).toEqual(generateBoard('one'));
    expect(generateBoard('one').tiles).not.toEqual(generateBoard('two').tiles);
  });
  it('generates the prescribed bag and nine disjoint coastal ports', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard(`board-${i}`),
        tiles = Object.values(board.tiles);
      expect(tiles.filter((t) => t.resource === null)).toHaveLength(1);
      expect(tiles.filter((t) => t.token === null)).toHaveLength(1);
      expect(board.ports).toHaveLength(9);
      expect(new Set(board.ports.flatMap((p) => p.vertices)).size).toBe(18);
      for (const p of board.ports) expect(board.edges[p.edgeId].hexes).toHaveLength(1);
    }
  });
});
