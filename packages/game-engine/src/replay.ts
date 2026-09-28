import type { GameReplay, GameState } from './types';
import { createGame, execute } from './engine';
import { hashSeed } from './random';
export function stateHash(state: GameState): string {
  const { history: _history, ...position } = state;
  return hashSeed(JSON.stringify(position)).toString(16).padStart(8, '0');
}
export function exportReplay(state: GameState): GameReplay {
  return {
    engineVersion: '0.1.0',
    rulesetVersion: state.rules.version,
    rules: structuredClone(state.rules),
    seed: state.seed,
    players: state.order.map((id) => {
      const { resources: _resources, ...spec } = state.players[id];
      return spec;
    }),
    commands: state.history.map((e, i) => ({ at: i, command: structuredClone(e.command) })),
  };
}
export function replayGame(replay: GameReplay, count = replay.commands.length): GameState {
  if (replay.engineVersion !== '0.1.0' || replay.rulesetVersion !== replay.rules.version)
    throw new Error('Unsupported replay version');
  if (!Number.isInteger(count) || count < 0 || count > replay.commands.length)
    throw new Error('Invalid replay position');
  let state = createGame(replay.seed, replay.players, replay.rules);
  for (const entry of replay.commands.slice(0, count)) state = execute(state, entry.command);
  return state;
}
