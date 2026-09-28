import { useState } from 'react';
import { SKILLS } from '@hextutor/shared';
import { DEFAULT_RULES, type GameState } from '@hextutor/game-engine';
import type { DecisionRecord } from '@hextutor/tutor';
import { Icon } from './Icon';
import { loadArchive, type SavedGame, downloadReplay } from './storage';
export function Learning({ records }: { records: DecisionRecord[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const skills = SKILLS.map((skill) => {
    const scores = records.flatMap((r) =>
      r.evaluation.skills.filter((s) => s.skill === skill).map((s) => s.score),
    );
    return {
      skill,
      score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    };
  });
  return (
    <div className="content-page">
      <span className="eyebrow">YOUR LEARNING JOURNAL</span>
      <h1>Play. Reflect. Grow.</h1>
      <p className="page-intro">
        A closer look at your openings, and the reasoning behind them. These are heuristic signals,
        not a rating of you as a player.
      </p>
      <div className="learning-layout">
        <section>
          <h2>
            Opening decisions <span className="count-tag">{records.length}</span>
          </h2>
          {!records.length && (
            <div className="empty-state">
              <Icon name="leaf" size={40} />
              <h3>Your next opening is your first lesson.</h3>
              <p>
                Place a starting settlement in Play. Your decision, alternatives, and factor
                breakdown will appear here.
              </p>
            </div>
          )}
          {records.map((record, i) => (
            <article key={record.stateHashBefore} className="decision-card">
              <div className="decision-heading">
                <span className="decision-number">0{i + 1}</span>
                <div>
                  <h3>Opening settlement {i + 1}</h3>
                  <p>
                    {record.evaluation.concepts
                      .slice(0, 3)
                      .map((c) => c.replaceAll('-', ' '))
                      .join(' · ')}
                  </p>
                </div>
                <span className={`quality ${record.evaluation.quality}`}>
                  {record.evaluation.quality.replaceAll('-', ' ')}
                </span>
              </div>
              <div className="decision-score">
                <strong>
                  {record.evaluation.chosenAction.evaluation}
                  <small>/100</small>
                </strong>
                <p>{record.evaluation.explanation[0]?.explanation}</p>
              </div>
              <button
                className="text-button"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {expanded === i ? 'Close analysis' : 'Explore alternatives'}
                <Icon name="arrow" size={15} />
              </button>
              {expanded === i && (
                <div className="decision-details">
                  {record.evaluation.explanation.map((f) => (
                    <p key={f.type}>
                      <strong>
                        {f.type.replaceAll('-', ' ')} · +{f.value.toFixed(1)}
                      </strong>
                      <br />
                      {f.explanation}
                    </p>
                  ))}
                  <h4>Other legal openings</h4>
                  {record.evaluation.alternatives.map((a, j) => (
                    <p key={j}>
                      <strong>
                        {String.fromCharCode(65 + j)} · {a.evaluation}/100
                      </strong>{' '}
                      <code>
                        {a.action.type === 'buildSettlement' ? a.action.vertexId : a.action.type}
                      </code>
                      <br />
                      {a.factors[0].explanation}
                    </p>
                  ))}
                  <small>Recorded before the move · state {record.stateHashBefore}</small>
                </div>
              )}
            </article>
          ))}
        </section>
        <section className="skill-card">
          <h2>Skills in focus</h2>
          <p>Relative decision scores from this game’s openings. Untested skills stay unscored.</p>
          {skills.map((s) => (
            <div className="skill-row" key={s.skill}>
              <span>{s.skill.replaceAll('-', ' ')}</span>
              <b>{s.score === null ? '—' : `${Math.round(s.score * 100)}%`}</b>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
export function Replays({
  state,
  onReplay,
  onLoad,
}: {
  state: GameState;
  onReplay: () => void;
  onLoad: (saved: SavedGame) => void;
}) {
  const saved = loadArchive();
  return (
    <div className="content-page">
      <span className="eyebrow">THE REPLAY ROOM</span>
      <h1>Every move has a story.</h1>
      <p className="page-intro">
        Reconstruct a game from its seed and command sequence. Pause at any decision and take
        another look.
      </p>
      <article className="replay-card">
        <div className="replay-art">
          <Icon name="hex" size={60} />
        </div>
        <div>
          <span className="eyebrow">CURRENT GAME</span>
          <h2>{state.seed}</h2>
          <p>
            {state.history.length} moves · {state.order.length} players · Turn {state.turn}
          </p>
          <div className="button-row">
            <button className="primary" disabled={!state.history.length} onClick={onReplay}>
              <Icon name="replay" size={18} />
              Watch replay
            </button>
            <button className="secondary" onClick={() => downloadReplay(state)}>
              <Icon name="download" size={17} />
              Export JSON
            </button>
          </div>
        </div>
      </article>
      <h2>Saved games</h2>
      {saved.length === 0 ? (
        <p className="muted">
          Completed and restarted games appear here. Games stay on this device.
        </p>
      ) : (
        saved.map((g) => (
          <article className="saved-game" key={g.id}>
            <Icon name="replay" />
            <div>
              <strong>{g.replay.seed}</strong>
              <p>
                {g.replay.commands.length} moves · {new Date(g.savedAt).toLocaleDateString()}
              </p>
            </div>
            <button className="secondary" onClick={() => onLoad(g)}>
              Watch replay
            </button>
          </article>
        ))
      )}
    </div>
  );
}
export function Guide() {
  return (
    <div className="content-page">
      <span className="eyebrow">A PLACE TO BEGIN</span>
      <h1>Learn the shape of the game.</h1>
      <p className="page-intro">
        An original island, shared resources, and a little friendly competition. Be the first to
        reach {DEFAULT_RULES.victoryPointsToWin} points.
      </p>
      <div className="guide-grid">
        {[
          {
            icon: 'home',
            title: '1. Make your opening',
            text: 'Place two settlements and a road beside each. Players go forward, then backward. Your second settlement gathers one card from each adjacent resource tile. Keep at least one empty intersection between settlements.',
          },
          {
            icon: 'dice',
            title: '2. Let the island produce',
            text: 'Roll two dice at the start of your turn. Every settlement beside a matching tile earns one resource. Cities earn two. The warden blocks its tile. The dots beneath each number show how often it is expected to roll.',
          },
          {
            icon: 'road',
            title: '3. Build your way forward',
            text: 'Road: 1 timber + 1 clay. Settlement: 1 timber + 1 clay + 1 wool + 1 grain. City upgrade: 2 grain + 3 ore. Build along your roads; an opponent’s settlement blocks your route.',
          },
          {
            icon: 'trade',
            title: '4. Work with what you have',
            text: 'Exchange 4 of one resource for 1 at the bank. A general port improves this to 3:1; a matching resource port to 2:1. Offer trades to another player when it helps you both.',
          },
          {
            icon: 'leaf',
            title: '5. Adapt to the warden',
            text: 'On a seven, hands over seven cards return half, rounded down. In this practice ruleset, those cards are selected automatically using the game seed. Move the warden, then take one random card from an adjacent opponent. The leading eligible opponent is selected automatically.',
          },
          {
            icon: 'trophy',
            title: '6. Find your finish',
            text: 'Settlements are worth one point, cities two. The longest continuous road network of at least five edges earns two bonus points. Ties retain the current holder. Reach ten points on your turn to win.',
          },
        ].map((card) => (
          <article key={card.title}>
            <span className="guide-icon">
              <Icon name={card.icon} size={26} />
            </span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
      <div className="guide-footnote">
        <Icon name="info" />
        <p>
          HexTutor 0.1 is local practice with open hands. Bots are deterministic learning partners.
          Online multiplayer, action cards, and deeper strategic search are planned.
        </p>
      </div>
    </div>
  );
}
