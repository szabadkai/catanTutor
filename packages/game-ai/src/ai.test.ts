import { it, expect } from 'vitest';
import { createGame, legalActions } from '@hextutor/game-engine';
import { HeuristicBot, RandomBot, evaluatePlacement } from './index';
it('bots choose reproducible legal actions', async () => {
  const s = createGame(),
    actions = legalActions(s);
  for (const bot of [new RandomBot(), new HeuristicBot()]) {
    const a = await bot.chooseAction(s, actions);
    expect(actions).toContainEqual(a);
    expect(await bot.chooseAction(s, actions)).toEqual(a);
  }
});
it('preserves the factors beneath opening evaluations', () => {
  const s = createGame(),
    v = Object.keys(s.board.vertices)[0],
    e = evaluatePlacement(s, v);
  expect(e.factors).toHaveLength(6);
  expect(e.factors.every((f) => f.explanation.length > 15)).toBe(true);
  expect(e.evaluation).toBeGreaterThanOrEqual(0);
  expect(e.evaluation).toBeLessThanOrEqual(100);
});
