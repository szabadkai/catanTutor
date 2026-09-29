import type { GameState } from '@hextutor/game-engine';

const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

export function TableDice({
  state,
  canRoll,
  onRoll,
}: {
  state: GameState;
  canRoll: boolean;
  onRoll: () => void;
}) {
  const ready = state.phase === 'roll';
  const dice = ready ? [1, 1] : (state.dice ?? [1, 1]);
  const faces = (
    <span className="dice-pair" aria-hidden="true">
      {dice.map((value, index) => (
        <span className="table-die" key={index}>
          {Array.from({ length: 9 }, (_, pip) => (
            <i key={pip} className={PIPS[value - 1].includes(pip) ? 'pip visible' : 'pip'} />
          ))}
        </span>
      ))}
    </span>
  );
  return (
    <div className="table-dice" key={`${state.turn}-${ready}`}>
      {canRoll ? (
        <button className="dice-roll" onClick={onRoll} aria-label="Roll dice">
          {faces}
          <span className="dice-caption">Tap to roll</span>
        </button>
      ) : (
        <div className={ready ? 'dice-waiting' : 'dice-landed'}>
          {faces}
          <span className="dice-caption" role="status">
            {ready ? 'Waiting to roll' : `Rolled ${dice[0] + dice[1]}`}
          </span>
        </div>
      )}
    </div>
  );
}
