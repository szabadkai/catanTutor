import { chooseHeuristicAction } from '@hextutor/game-ai';
import { legalActions } from '@hextutor/game-engine';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { TradeDialog } from './TradeDialog';
import { downloadReplay } from './storage';
import type { GameController } from './useGameSession';
export function GameDialogs({ game }: { game: GameController }) {
  const {
    dialog,
    setDialog,
    session,
    dispatch,
    seed,
    setSeed,
    opponents,
    setOpponents,
    playerCount,
    setPlayerCount,
    restart,
    settings,
    setSettings,
    state,
    replay,
    setError,
    replayCursor,
    debugTab,
    setDebugTab,
    actions,
  } = game;
  return (
    <>
      {' '}
      {dialog === 'trade' && (
        <TradeDialog state={session.state} onCommand={dispatch} onClose={() => setDialog(null)} />
      )}
      {dialog === 'new' && (
        <Modal title="A fresh island awaits." onClose={() => setDialog(null)}>
          <p className="muted">Your current game will be saved to the Replay room.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              restart();
            }}
          >
            <label className="field">
              Island seed
              <input
                value={seed}
                maxLength={80}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="a-little-wiser"
              />
              <small>The same seed always creates the same island.</small>
            </label>
            <div className="form-columns">
              <label className="field">
                Players
                <select
                  aria-label="Players"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                >
                  <option value={4}>4 players</option>
                  <option value={3}>3 players</option>
                </select>
              </label>
              <label className="field">
                At your table
                <select value={opponents} onChange={(e) => setOpponents(e.target.value)}>
                  <option value="bots">You + practice bots</option>
                  <option value="hotseat">Local pass-and-play</option>
                </select>
              </label>
            </div>
            <button className="primary full" type="submit">
              Begin a new game
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal title="Make yourself at home." onClose={() => setDialog(null)}>
          <label className="field">
            Tutor mode
            <select
              value={settings.mode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, mode: e.target.value as typeof s.mode }))
              }
            >
              <option value="guided">Guided — explanations when you need them</option>
              <option value="socratic">Socratic — think through a question</option>
              <option value="hint">Hint — a gentle nudge</option>
              <option value="silent">Silent — reflect after playing</option>
            </select>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={settings.probabilities}
              onChange={(e) => setSettings((s) => ({ ...s, probabilities: e.target.checked }))}
            />
            Show probability dots on tokens
          </label>
          <label className="field">
            Bot pace
            <select
              value={settings.botSpeed}
              onChange={(e) => setSettings((s) => ({ ...s, botSpeed: Number(e.target.value) }))}
            >
              <option value={700}>Thoughtful</option>
              <option value={150}>Quick</option>
              <option value={1500}>Relaxed</option>
            </select>
          </label>
          <p className="fine-print">
            Settings and games are stored in this browser. Reduced-motion preferences are respected
            automatically.
          </p>
          <button className="primary full" onClick={() => setDialog(null)}>
            Back to the island
          </button>
        </Modal>
      )}
      {dialog === 'debug' && (
        <Modal title="Engine tools" wide onClose={() => setDialog(null)}>
          <div className="debug-summary">
            <span>
              Seed <b>{state.seed}</b>
            </span>
            <span>
              Turn <b>{state.turn}</b>
            </span>
            <span>
              Phase <b>{state.phase}</b>
            </span>
            <span>
              Player <b>{state.activePlayerId}</b>
            </span>
          </div>
          <div className="button-row">
            <button className="secondary" onClick={() => downloadReplay(session.state)}>
              <Icon name="download" size={16} />
              Export replay
            </button>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(replay, null, 2));
                  setError('Replay copied to clipboard.');
                } catch {
                  downloadReplay(session.state);
                }
              }}
            >
              Copy replay
            </button>
            <button className="secondary" onClick={() => restart(true)}>
              Restart seed
            </button>
            <button
              className="secondary"
              disabled={replayCursor !== null || !!state.winner}
              onClick={() =>
                dispatch(chooseHeuristicAction(session.state, legalActions(session.state)))
              }
            >
              Play one legal action
            </button>
          </div>
          <div className="debug-tabs">
            {['events', 'state', 'legal actions', 'resources'].map((t) => (
              <button
                key={t}
                className={debugTab === t ? 'active' : ''}
                onClick={() => setDebugTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <pre>
            {JSON.stringify(
              debugTab === 'state'
                ? state
                : debugTab === 'legal actions'
                  ? actions
                  : debugTab === 'resources'
                    ? Object.fromEntries(state.order.map((id) => [id, state.players[id].resources]))
                    : state.history.map((e) => ({
                        id: e.id,
                        type: e.type,
                        message: e.message,
                        command: e.command,
                      })),
              null,
              2,
            )}
          </pre>
          <p className="fine-print">
            Only legal actions are injected here, so exported games remain reproducible. Run batch
            simulations with pnpm simulate --games 10000.
          </p>
        </Modal>
      )}
    </>
  );
}
