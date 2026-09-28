import { useState } from 'react';
import { RESOURCES, RESOURCE_LABELS, type TutorMode } from '@hextutor/shared';
import { resourceEconomy, type GameCommand, type GameState } from '@hextutor/game-engine';
import { evaluatePlacement } from '@hextutor/game-ai';
import type { DecisionRecord } from '@hextutor/tutor';
import { Icon } from './Icon';
interface Props {
  state: GameState;
  selected: GameCommand | null;
  mode: TutorMode;
  setMode: (mode: TutorMode) => void;
  showCandidates: boolean;
  setShowCandidates: (value: boolean) => void;
  records: DecisionRecord[];
}
const MODE_COPY: Record<TutorMode, string> = {
  guided: 'A little guidance, every step.',
  socratic: 'Good questions make better players.',
  hint: 'A nudge when you need one.',
  silent: 'Your game. Your judgment.',
};
export function Coach({
  state,
  selected,
  mode,
  setMode,
  showCandidates,
  setShowCandidates,
  records,
}: Props) {
  const [why, setWhy] = useState(false),
    [answer, setAnswer] = useState<string | null>(null);
  const setup = state.phase.startsWith('setup'),
    playerId = selected?.playerId ?? state.activePlayerId;
  const evaluation =
    selected?.type === 'buildSettlement'
      ? evaluatePlacement(state, selected.vertexId, playerId)
      : null;
  const economy = resourceEconomy(state, 'you'),
    missing = RESOURCES.filter((r) => economy.expectedPerRoll[r] === 0);
  return (
    <aside className="coach-column">
      <section className="coach-card">
        <div className="coach-header">
          <div className="coach-emblem">
            <Icon name="spark" size={21} />
          </div>
          <div>
            <h2>Your table-side tutor</h2>
            <p>{MODE_COPY[mode]}</p>
          </div>
          <span className="beta-tag">BETA</span>
        </div>
        <div className="mode-row">
          <span>TUTOR MODE</span>
          <select
            aria-label="Tutor mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as TutorMode);
              setShowCandidates(false);
              setWhy(false);
            }}
          >
            <option value="guided">Guided</option>
            <option value="socratic">Socratic</option>
            <option value="hint">Hint only</option>
            <option value="silent">Silent</option>
          </select>
        </div>
        <div className="coach-body">
          <span className="eyebrow">{setup ? 'THE OPENING' : 'AT THE TABLE'}</span>
          <h3>
            {mode === 'silent'
              ? 'Make your own mark.'
              : setup
                ? state.setupIndex >= state.order.length
                  ? 'Find the missing piece.'
                  : 'A good start is more than a good number.'
                : 'Build with a purpose.'}
          </h3>
          {mode === 'silent' ? (
            <p>
              Advice is tucked away. Your opening decisions are still recorded for you to revisit in
              Your learning.
            </p>
          ) : mode === 'hint' ? (
            <p>
              {setup
                ? 'Think about the resources your first two builds will need. Will these intersections produce them together?'
                : 'Look at your hand and choose one build to work toward. What is the bottleneck?'}
            </p>
          ) : (
            <p>
              {setup
                ? state.setupIndex >= state.order.length
                  ? 'Your second settlement should complement your first. A new resource can be worth more than a little extra production.'
                  : 'Look for a balance of steady production, useful resources, and room to grow. Your second settlement can fill the gaps.'
                : missing.length
                  ? `You don’t currently produce ${missing.map((r) => RESOURCE_LABELS[r].toLowerCase()).join(', ')}. Consider a trade, a port, or an expansion that fills the gap.`
                  : 'You have all five resources covered. Consider which upgrade gets you to your next point sooner.'}
            </p>
          )}
          {mode === 'socratic' && (
            <div className="socratic">
              <strong>Two spots have similar production. What else matters?</strong>
              {[
                'The resources I already produce',
                'Only the highest number',
                'The closest coast, every time',
              ].map((a) => (
                <button
                  key={a}
                  className={answer === a ? 'chosen' : ''}
                  onClick={() => setAnswer(a)}
                >
                  {a}
                </button>
              ))}
              {answer && (
                <p className="answer-feedback">
                  {answer.startsWith('The resources')
                    ? 'Exactly. Complementary resources reduce your dependence on a willing trade partner.'
                    : 'Consider the whole economy. A coastal or high-number spot can help, but neither is automatically the strongest choice.'}
                </p>
              )}
            </div>
          )}
          {setup && (mode === 'guided' || (mode === 'socratic' && answer)) && (
            <button
              className={`secondary full ${showCandidates ? 'active' : ''}`}
              onClick={() => setShowCandidates(!showCandidates)}
            >
              <Icon name="spark" size={16} />
              {showCandidates ? 'Hide suggested openings' : 'Compare three openings'}
              <span className="button-tail">{showCandidates ? '−' : '+'}</span>
            </button>
          )}
        </div>
        {evaluation && mode !== 'silent' && mode !== 'hint' && (mode !== 'socratic' || answer) && (
          <div className="placement-insight">
            <div className="insight-heading">
              <div>
                <span className="eyebrow">YOUR SELECTED SPOT</span>
                <h4>{evaluation.coverage} resources. A new possibility.</h4>
              </div>
              <div className="score-badge">
                {evaluation.evaluation}
                <small>/100</small>
              </div>
            </div>
            <div className="production-mini">
              {RESOURCES.map((r) => (
                <div key={r}>
                  <span className={`resource-mark ${r}`} />
                  <b>{evaluation.production[r].toFixed(2)}</b>
                  <small>{RESOURCE_LABELS[r]}</small>
                </div>
              ))}
            </div>
            <button className="text-button why-button" onClick={() => setWhy(!why)}>
              <Icon name="info" size={15} />
              {why ? 'Hide the reasoning' : 'Why this score?'} <span>{why ? '−' : '↗'}</span>
            </button>
            {why && (
              <div className="factor-list">
                {evaluation.factors.map((f) => (
                  <div key={f.type}>
                    <div>
                      <strong>{f.type.replaceAll('-', ' ')}</strong>
                      <b>+{f.value.toFixed(1)}</b>
                    </div>
                    <p>{f.explanation}</p>
                  </div>
                ))}
                <p className="fine-print">
                  A heuristic estimate, not a solved position. Scores compare production, coverage,
                  synergy, scarcity, expansion, and ports. Confidence: moderate.
                </p>
              </div>
            )}
          </div>
        )}
        {!evaluation && (
          <div className="tutor-note">
            <Icon name="leaf" size={18} />
            <p>
              {setup
                ? 'There’s no perfect opening. There are tradeoffs you can learn to see.'
                : 'A good plan changes when the island does.'}
            </p>
          </div>
        )}
        <div className="coach-footer">
          <span className="live-dot" /> Explainable advice. No black box.
        </div>
      </section>
      <section className="economy-card">
        <div className="section-heading">
          <h3>Your production</h3>
          <span>per roll</span>
        </div>
        {RESOURCES.map((r) => (
          <div className="economy-row" key={r}>
            <span className={`resource-mark ${r}`} />
            <span>{RESOURCE_LABELS[r]}</span>
            <div className="production-track">
              <i
                className={r}
                style={{ width: `${Math.min(100, economy.expectedPerRoll[r] * 160)}%` }}
              />
            </div>
            <b>{economy.expectedPerRoll[r].toFixed(2)}</b>
          </div>
        ))}
        <p>
          {economy.diversity}/5 resources covered <span>·</span>{' '}
          {economy.totalProduction.toFixed(2)} expected / roll
        </p>
      </section>
      <div className="learning-note">
        <span className="note-icon">
          <Icon name="book" size={18} />
        </span>
        <p>
          <strong>Every move is a lesson.</strong>
          <br />
          {records.length
            ? `${records.length} opening ${records.length === 1 ? 'decision' : 'decisions'} saved for your review.`
            : 'Your opening decisions will be saved for review.'}
        </p>
      </div>
    </aside>
  );
}
