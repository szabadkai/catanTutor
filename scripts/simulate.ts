import { simulate } from '../packages/test-utils/src/index';
const args = process.argv.slice(2),
  at = args.indexOf('--games'),
  games = at < 0 ? 100 : Number(args[at + 1]);
if (!Number.isInteger(games) || games < 1) throw new Error('--games must be a positive integer');
const startAt = args.indexOf('--start-index'),
  start = startAt < 0 ? 0 : Number(args[startAt + 1]);
if (!Number.isInteger(start) || start < 0)
  throw new Error('--start-index must be a nonnegative integer');
const started = Date.now();
let commands = 0,
  maxTurns = 0;
for (let i = 0; i < games; i++) {
  const result = simulate(`simulation-${start + i}`);
  commands += result.commands;
  maxTurns = Math.max(maxTurns, result.state.turn);
  if ((i + 1) % 100 === 0) process.stdout.write(`${i + 1}/${games} games passed\n`);
}
console.log(
  JSON.stringify(
    { games, commands, maxTurns, seconds: (Date.now() - started) / 1000, invariants: 'passed' },
    null,
    2,
  ),
);
