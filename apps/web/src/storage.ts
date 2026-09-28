import {
  createGame,
  exportReplay,
  replayGame,
  stateHash,
  type GameReplay,
  type GameState,
} from '@hextutor/game-engine';
import type { DecisionRecord } from '@hextutor/tutor';
import type { TutorMode } from '@hextutor/shared';
export interface Settings {
  mode: TutorMode;
  probabilities: boolean;
  botSpeed: number;
}
export interface Session {
  state: GameState;
  records: DecisionRecord[];
}
export interface SavedGame {
  id: string;
  replay: GameReplay;
  records: DecisionRecord[];
  savedAt: string;
}
const KEY = 'hextutor.session.v1';
export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { replay: GameReplay; records: DecisionRecord[] };
      return {
        state: replayGame(saved.replay),
        records: Array.isArray(saved.records) ? saved.records : [],
      };
    }
  } catch {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* Storage may be disabled entirely. */
    }
  }
  return { state: createGame(), records: [] };
}
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(
      localStorage.getItem('hextutor.settings.v1') ?? '{}',
    ) as Partial<Settings>;
    return {
      mode: ['guided', 'socratic', 'hint', 'silent'].includes(raw.mode ?? '')
        ? raw.mode!
        : 'guided',
      probabilities: raw.probabilities ?? true,
      botSpeed: [150, 700, 1500].includes(raw.botSpeed ?? 0) ? raw.botSpeed! : 700,
    };
  } catch {
    return { mode: 'guided', probabilities: true, botSpeed: 700 };
  }
}
export function saveSession(session: Session): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({ replay: exportReplay(session.state), records: session.records }),
  );
}
export function loadArchive(): SavedGame[] {
  try {
    return JSON.parse(localStorage.getItem('hextutor.archive.v1') ?? '[]') as SavedGame[];
  } catch {
    return [];
  }
}
export function archiveSession(session: Session): void {
  const replay = exportReplay(session.state),
    id = `${replay.seed}:${replay.commands.length}:${stateHash(session.state)}`;
  const saved = loadArchive().filter((g) => g.id !== id);
  localStorage.setItem(
    'hextutor.archive.v1',
    JSON.stringify(
      [{ id, replay, records: session.records, savedAt: new Date().toISOString() }, ...saved].slice(
        0,
        12,
      ),
    ),
  );
}
export function downloadReplay(state: GameState): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(exportReplay(state), null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `hextutor-${state.seed.replace(/[^a-z0-9-]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
