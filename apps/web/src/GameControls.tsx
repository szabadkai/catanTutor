import { RESOURCES, RESOURCE_LABELS } from '@hextutor/shared';
import { victoryPoints, type GameCommand, type GameState } from '@hextutor/game-engine';
import { Icon } from './Icon';
import { ResourceArt } from '@hextutor/game-ui';
export type BuildMode = 'settlement' | 'city' | null;
export function Players({ state }: { state: GameState }) {
  return (
    <div className="players-row">
      {state.order.map((id, i) => {
        const player = state.players[id],
          active = id === state.activePlayerId;
        return (
          <div className={`player-card ${active ? 'current' : ''}`} key={id}>
            <span
              className="player-avatar"
              style={{ background: `${player.color}22`, color: player.color }}
            >
              {i === 0 ? <Icon name="leaf" size={23} /> : player.name[0]}
            </span>
            <div className="player-info">
              <strong>
                {player.name}
                {id === 'you' && <small>YOU</small>}
              </strong>
              <span>
                {active
                  ? state.phase.startsWith('setup')
                    ? 'Placing an opening'
                    : 'At the table'
                  : player.agent === 'human'
                    ? 'Local player'
                    : 'Practice bot'}
              </span>
            </div>
            <div className="player-points">
              <strong>
                {victoryPoints(state, id)}
                <small>/{state.rules.victoryPointsToWin}</small>
              </strong>
              <span>points</span>
            </div>
            {active && <span className="turn-indicator" style={{ background: player.color }} />}
          </div>
        );
      })}
    </div>
  );
}
export function Hand({
  state,
  actions,
  buildMode,
  setBuildMode,
  onTrade,
  isHuman,
}: {
  state: GameState;
  actions: GameCommand[];
  buildMode: BuildMode;
  setBuildMode: (mode: BuildMode) => void;
  onTrade: () => void;
  isHuman: boolean;
}) {
  const player = state.players[isHuman ? state.activePlayerId : 'you'];
  return (
    <section className="hand-panel">
      <div className="hand-heading">
        <h3>{player.id === 'you' ? 'Your hand' : `${player.name}’s hand`}</h3>
        <span>
          {state.phase.startsWith('setup')
            ? 'Your second settlement gathers starting resources'
            : 'Open hands · local practice'}
        </span>
      </div>
      <div className="hand-content">
        <div className="resource-cards">
          {RESOURCES.map((r) => (
            <div key={r} className={`resource-card ${r}`}>
              <ResourceArt resource={r} />
              <strong>{player.resources[r]}</strong>
              <small>{RESOURCE_LABELS[r]}</small>
            </div>
          ))}
        </div>
        <div className="build-controls">
          {(
            [
              {
                mode: 'settlement',
                type: 'buildSettlement',
                label: 'Settlement',
                cost: '1 timber · 1 clay · 1 wool · 1 grain',
                icon: 'home',
              },
              {
                mode: 'city',
                type: 'upgradeCity',
                label: 'City',
                cost: '2 grain · 3 ore',
                icon: 'city',
              },
            ] as const
          ).map((b) => (
            <button
              key={b.mode}
              className={buildMode === b.mode ? 'selected' : ''}
              aria-pressed={buildMode === b.mode}
              disabled={
                !isHuman || state.phase !== 'main' || !actions.some((a) => a.type === b.type)
              }
              onClick={() => setBuildMode(buildMode === b.mode ? null : b.mode)}
              title={b.cost}
            >
              <Icon name={b.icon} size={17} />
              <span>{b.label}</span>
            </button>
          ))}
          <button disabled={!isHuman || state.phase !== 'main'} onClick={onTrade}>
            <Icon name="trade" size={17} />
            <span>Trade</span>
          </button>
        </div>
      </div>
    </section>
  );
}
export function TurnPrompt({
  state,
  selected,
  onConfirm,
  onCommand,
  isHuman,
  replaying,
  canBuildRoad,
}: {
  state: GameState;
  selected: GameCommand | null;
  onConfirm: () => void;
  onCommand: (command: GameCommand) => void;
  isHuman: boolean;
  replaying: boolean;
  canBuildRoad: boolean;
}) {
  const setup = state.phase.startsWith('setup'),
    road = state.phase === 'setup-road';
  let title = setup
    ? road
      ? 'Give your settlement a direction.'
      : 'Where will your story begin?'
    : state.phase === 'roll'
      ? 'A new turn. A new possibility.'
      : state.phase === 'blocker'
        ? 'Move the warden to another tile.'
        : 'Make your next move count.';
  let text = setup
    ? road
      ? 'Tap a highlighted edge to place your road.'
      : 'Select an open intersection to explore its potential.'
    : state.phase === 'roll'
      ? 'Tap the dice on the island to gather resources.'
      : state.phase === 'blocker'
        ? 'The warden blocks production and takes one card from an adjacent opponent.'
        : canBuildRoad
          ? 'Tap a highlighted edge to build a road. Each costs 1 timber + 1 clay.'
          : 'Build, trade, or save your resources for the next turn.';
  if (!isHuman) {
    title = `${state.players[state.activePlayerId].name} is thinking…`;
    text = 'Watch how the island changes. Your next turn is on its way.';
  }
  if (state.winner) {
    title = `${state.players[state.winner].name} wins the island.`;
    text =
      'Your replay and opening decisions are saved. Revisit them to see what made a difference.';
  }
  if (replaying) {
    title = 'Every decision, one step at a time.';
    text = 'Use the replay controls to explore this game. Return to live play when you’re ready.';
  }
  return (
    <section className="turn-prompt">
      <span className="prompt-icon">
        <Icon
          name={state.winner ? 'trophy' : setup ? 'home' : state.phase === 'roll' ? 'dice' : 'leaf'}
          size={22}
        />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      {!replaying &&
        isHuman &&
        !state.winner &&
        (selected ? (
          <button className="primary" onClick={onConfirm}>
            {selected.type === 'buildSettlement'
              ? 'Place settlement'
              : selected.type === 'buildRoad'
                ? 'Build road'
                : selected.type === 'upgradeCity'
                  ? 'Upgrade city'
                  : 'Move warden'}
            <Icon name="arrow" size={17} />
          </button>
        ) : state.phase === 'roll' ? (
          <span className="waiting-label">TAP THE DICE</span>
        ) : state.phase === 'main' ? (
          <button
            className="primary"
            onClick={() => onCommand({ type: 'endTurn', playerId: state.activePlayerId })}
          >
            End turn
            <Icon name="arrow" size={17} />
          </button>
        ) : (
          <span className="waiting-label">{road ? 'CHOOSE A ROAD' : 'CHOOSE A SPOT'}</span>
        ))}
    </section>
  );
}
