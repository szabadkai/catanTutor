import { it, expect } from 'vitest';
import { createGame, legalActions, stateHash } from '@hextutor/game-engine';
import { recordDecision, rankPlacements } from './index';
it('records the chosen action, alternatives and attributable skill factors', () => {
  const s = createGame(),
    actions = legalActions(s),
    ranked = rankPlacements(s, actions),
    chosen = ranked[0].action,
    record = recordDecision(s, chosen, actions);
  expect(record.stateHashBefore).toBe(stateHash(s));
  expect(record.evaluation.quality).toBe('excellent');
  expect(record.evaluation.alternatives).toHaveLength(3);
  expect(record.evaluation.explanation.length).toBeGreaterThan(0);
  expect(record.evaluation.skills.map((s) => s.skill)).toContain('production');
});
