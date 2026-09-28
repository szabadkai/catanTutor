import { it, expect } from 'vitest';
import { exportReplay, replayGame, stateHash } from '@hextutor/game-engine';
import { simulate, invariantErrors } from './index';
it.each(Array.from({ length: 8 }, (_, i) => `simulation-${i}`))(
  'finishes %s with valid resources, buildings and winner',
  (seed) => {
    const { state } = simulate(seed);
    expect(invariantErrors(state)).toEqual([]);
    expect(state.winner).not.toBeNull();
    expect(stateHash(replayGame(exportReplay(state)))).toBe(stateHash(state));
  },
);

it('randomized legal play preserves invariants, including trade responses', async () => {
  const { createGame, execute, legalActions } = await import('@hextutor/game-engine');
  const { RandomBot } = await import('@hextutor/game-ai');
  const bot = new RandomBot();
  for (let i = 0; i < 20; i++) {
    let state = createGame(`random-fuzz-${i}`);
    for (let move = 0; move < 200 && !state.winner; move++) {
      const actor = state.trade?.to ?? state.activePlayerId;
      const actions = legalActions(state, actor);
      expect(actions.length).toBeGreaterThan(0);
      state = execute(state, await bot.chooseAction(state, actions));
      expect(invariantErrors(state)).toEqual([]);
    }
    expect(stateHash(replayGame(exportReplay(state)))).toBe(stateHash(state));
  }
});
