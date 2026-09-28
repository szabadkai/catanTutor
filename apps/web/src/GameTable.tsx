import { Board } from '@hextutor/game-ui';
import { RESOURCE_LABELS } from '@hextutor/shared';
import { Icon } from './Icon';
import { Coach } from './Coach';
import { Hand, Players, TurnPrompt } from './GameControls';
import type { GameController } from './useGameSession';
export function GameTable({ game }: { game: GameController }) {
  const {
    state,
    session,
    settings,
    setSettings,
    setView,
    isHuman,
    actions,
    boardActions,
    candidates,
    selected,
    setSelected,
    replayCursor,
    setReplayCursor,
    replay,
    playing,
    setPlaying,
    dispatch,
    setError,
    setDialog,
    buildMode,
    setBuildMode,
    showCandidates,
    setShowCandidates,
  } = game;
  return (
    <main className="play-page">
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            THE PRACTICE TABLE <span>/</span>{' '}
            {state.phase.startsWith('setup')
              ? 'OPENING PLACEMENT'
              : replayCursor !== null
                ? 'REPLAY'
                : 'ISLAND STRATEGY'}
          </div>
          <h1>
            {state.winner
              ? 'A game worth looking back on.'
              : state.phase.startsWith('setup')
                ? 'Great games begin here.'
                : 'Find your next possibility.'}
          </h1>
          <p>
            {state.phase.startsWith('setup')
              ? 'A new island. A fresh perspective. Make your first moves with intention.'
              : 'Gather, trade, and grow. There’s something to learn in every turn.'}
          </p>
        </div>
        <button className="text-button help-button" onClick={() => setView('guide')}>
          <Icon name="book" size={17} />
          How to play
          <Icon name="arrow" size={15} />
        </button>
      </div>
      <Players state={state} />
      <div className="table-layout">
        <div className="game-column">
          <div className="board-wrapper">
            <div className="table-status">
              <span className="phase-pill">
                <span className="live-dot" />
                {state.phase.startsWith('setup')
                  ? `Opening · ${Math.min(2, Math.floor(state.setupIndex / state.order.length) + 1)} of 2`
                  : state.winner
                    ? 'Game complete'
                    : `Turn ${state.turn}`}
              </span>
              <span>
                {state.phase.startsWith('setup') ? (
                  'Place 2 settlements & 2 roads'
                ) : state.dice ? (
                  <span
                    className="dice-result"
                    aria-label={`Rolled ${state.dice[0] + state.dice[1]}`}
                  >
                    {state.dice.map((d, i) => (
                      <span key={i}>{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][d]}</span>
                    ))}
                    <b>{state.dice[0] + state.dice[1]}</b>
                  </span>
                ) : (
                  'Roll · Build · Trade'
                )}
              </span>
            </div>
            {replayCursor !== null && (
              <div className="replay-controls">
                <button
                  aria-label="First move"
                  onClick={() => {
                    setReplayCursor(0);
                    setPlaying(false);
                  }}
                >
                  ⏮
                </button>
                <button
                  aria-label="Previous move"
                  onClick={() => {
                    setReplayCursor(Math.max(0, replayCursor - 1));
                    setPlaying(false);
                  }}
                >
                  ‹
                </button>
                <button
                  aria-label={playing ? 'Pause replay' : 'Play replay'}
                  onClick={() => {
                    if (replayCursor === replay.commands.length) setReplayCursor(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? 'Ⅱ' : '▶'}
                </button>
                <button
                  aria-label="Next move"
                  onClick={() => {
                    setReplayCursor(Math.min(replay.commands.length, replayCursor + 1));
                    setPlaying(false);
                  }}
                >
                  ›
                </button>
                <button
                  aria-label="Last move"
                  onClick={() => {
                    setReplayCursor(replay.commands.length);
                    setPlaying(false);
                  }}
                >
                  ⏭
                </button>
                <input
                  aria-label="Replay position"
                  type="range"
                  min="0"
                  max={replay.commands.length}
                  value={replayCursor}
                  onChange={(e) => {
                    setReplayCursor(Number(e.target.value));
                    setPlaying(false);
                  }}
                />
                <span>
                  {replayCursor}/{replay.commands.length}
                </span>
                <button
                  className="return-live"
                  onClick={() => {
                    setReplayCursor(null);
                    setPlaying(false);
                  }}
                >
                  Return to live
                </button>
              </div>
            )}
            <Board
              state={state}
              actions={boardActions}
              selected={selected}
              candidates={candidates}
              onSelect={(c) => {
                setSelected(c);
                setError('');
              }}
              showProbabilities={settings.probabilities}
            />
            <TurnPrompt
              state={state}
              selected={selected}
              onConfirm={() => selected && dispatch(selected)}
              onCommand={dispatch}
              isHuman={isHuman}
              replaying={replayCursor !== null}
            />
          </div>
          {state.trade && (
            <div className="trade-offer">
              <Icon name="trade" />
              <p>
                <strong>
                  {state.players[state.trade.from].name} offers {state.trade.giveAmount}{' '}
                  {RESOURCE_LABELS[state.trade.give]}
                </strong>{' '}
                for {state.trade.receiveAmount} {RESOURCE_LABELS[state.trade.receive]} from{' '}
                {state.players[state.trade.to].name}.
              </p>
              {state.players[state.trade.to].agent === 'human' && replayCursor === null ? (
                <>
                  <button
                    className="primary compact"
                    onClick={() => dispatch({ type: 'acceptTrade', playerId: state.trade!.to })}
                  >
                    Accept
                  </button>
                  <button
                    className="secondary compact"
                    onClick={() => dispatch({ type: 'rejectTrade', playerId: state.trade!.to })}
                  >
                    Decline
                  </button>
                </>
              ) : (
                <small>Waiting for response…</small>
              )}
            </div>
          )}
          <Hand
            state={state}
            actions={actions}
            buildMode={buildMode}
            setBuildMode={(mode) => {
              setBuildMode(mode);
              setSelected(null);
            }}
            onTrade={() => setDialog('trade')}
            isHuman={isHuman}
          />
          <div className="table-footer">
            <span>
              <Icon name="check" size={14} />
              Saved on this device
            </span>
            <span>
              {state.history.at(-1)?.message ?? 'The island is ready for your first move.'}
            </span>
            <button className="text-button" onClick={() => setDialog('debug')}>
              <Icon name="code" size={15} />
              Engine tools
            </button>
          </div>
        </div>
        <Coach
          state={state}
          selected={selected}
          mode={settings.mode}
          setMode={(mode) => setSettings((s) => ({ ...s, mode }))}
          showCandidates={showCandidates}
          setShowCandidates={setShowCandidates}
          records={session.records}
        />
      </div>
    </main>
  );
}
