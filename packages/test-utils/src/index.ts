import { RESOURCES } from '@hextutor/shared';
import {
  createGame,
  DEFAULT_PLAYERS,
  execute,
  legalActions,
  victoryPoints,
  type GameState,
} from '@hextutor/game-engine';
import { chooseHeuristicAction } from '@hextutor/game-ai';
export function invariantErrors(state: GameState): string[] {
  const errors: string[] = [];
  for (const r of RESOURCES) {
    const values = [state.bank[r], ...state.order.map((p) => state.players[p].resources[r])];
    if (values.some((n) => !Number.isInteger(n) || n < 0)) errors.push(`Invalid ${r} count`);
    if (values.reduce((a, b) => a + b, 0) !== state.rules.bankSupply)
      errors.push(`${r} is not conserved`);
  }
  for (const [v] of Object.entries(state.buildings)) {
    if (!state.board.vertices[v]) errors.push(`Unknown vertex ${v}`);
    else if (state.board.vertices[v].neighbors.some((n) => state.buildings[n]))
      errors.push('Distance rule violated');
  }
  for (const e of Object.keys(state.roads))
    if (!state.board.edges[e]) errors.push(`Unknown road ${e}`);
  if (state.winner && victoryPoints(state, state.winner) < state.rules.victoryPointsToWin)
    errors.push('Winner below point threshold');
  return errors;
}
export function simulate(
  seed: string,
  maxCommands = 5000,
  checkEveryMove = true,
): { state: GameState; commands: number } {
  let state = createGame(
    seed,
    DEFAULT_PLAYERS.map((p) => ({ ...p, agent: 'heuristic' })),
  );
  for (let commands = 0; commands < maxCommands; commands++) {
    if (state.winner) return { state, commands };
    const actions = legalActions(state);
    const command = chooseHeuristicAction(state, actions);
    state = execute(state, command);
    if (checkEveryMove) {
      const errors = invariantErrors(state);
      if (errors.length) throw new Error(`${seed}: ${errors.join('; ')}`);
    }
  }
  throw new Error(`${seed}: did not finish after ${maxCommands} commands (turn ${state.turn})`);
}
