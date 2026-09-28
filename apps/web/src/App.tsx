import { replayGame } from '@hextutor/game-engine';
import { Icon } from './Icon';
import { Guide, Learning, Replays } from './Review';
import { useGameSession } from './useGameSession';
import { GameTable } from './GameTable';
import { GameDialogs } from './GameDialogs';
export default function App() {
  const game = useGameSession();
  const { view, setView, setDialog, error, setError, session, showReplay, loadSaved } = game;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand-mark"
          href="#"
          aria-label="HexTutor home"
          onClick={(e) => {
            e.preventDefault();
            setView('play');
          }}
        >
          <Icon name="hex" size={32} />
        </a>
        <nav>
          {(
            [
              { id: 'play', icon: 'hex', label: 'Play' },
              { id: 'learning', icon: 'chart', label: 'Your learning' },
              { id: 'replays', icon: 'replay', label: 'Replays' },
              { id: 'guide', icon: 'book', label: 'How to play' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} size={23} />
              <span>
                {item.id === 'learning' ? 'Learn' : item.id === 'guide' ? 'Guide' : item.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" aria-label="Settings" onClick={() => setDialog('settings')}>
            <Icon name="settings" size={22} />
          </button>
          <span className="user-avatar">Y</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <a
            href="#"
            className="wordmark"
            onClick={(e) => {
              e.preventDefault();
              setView('play');
            }}
          >
            hex<span>tutor</span>
            <i />
          </a>
          <div className="topbar-center">
            <span className="topbar-divider" />A little wiser with every move.
          </div>
          <div className="topbar-actions">
            <span className="practice-tag">
              <span className="live-dot" /> LOCAL PRACTICE
            </span>
            <button className="secondary compact" onClick={() => setDialog('new')}>
              New game<span>+</span>
            </button>
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {view === 'play' ? (
          <GameTable game={game} />
        ) : view === 'learning' ? (
          <Learning records={session.records} />
        ) : view === 'replays' ? (
          <Replays
            state={session.state}
            onReplay={showReplay}
            onLoad={(saved) => {
              try {
                loadSaved({ state: replayGame(saved.replay), records: saved.records });
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Invalid saved game');
              }
            }}
          />
        ) : (
          <Guide />
        )}
        <footer className="app-footer">
          <span>
            HEXTUTOR <small>Play thoughtfully.</small>
          </span>
          <span>
            A work in progress, just like every great player. <i>v0.1</i>
          </span>
        </footer>
      </div>
      <GameDialogs game={game} />
    </div>
  );
}
