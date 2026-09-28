import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyCommand,
  applyEvents,
  createGame,
  DEFAULT_PLAYERS,
  exportReplay,
  legalActions,
  replayGame,
  type GameCommand,
} from '@hextutor/game-engine';
import { chooseHeuristicAction } from '@hextutor/game-ai';
import { rankPlacements, recordDecision } from '@hextutor/tutor';
import { archiveSession, loadSession, loadSettings, saveSession, type Session } from './storage';
import type { BuildMode } from './GameControls';
type View = 'play' | 'learning' | 'replays' | 'guide';
type Dialog = 'new' | 'settings' | 'debug' | 'trade' | null;
export function useGameSession() {
  const [session, setSession] = useState(loadSession),
    [settings, setSettings] = useState(loadSettings),
    [view, setView] = useState<View>('play'),
    [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<GameCommand | null>(null),
    [buildMode, setBuildMode] = useState<BuildMode>(null),
    [showCandidates, setShowCandidates] = useState(false),
    [error, setError] = useState('');
  const [seed, setSeed] = useState('a-little-wiser'),
    [opponents, setOpponents] = useState('bots'),
    [playerCount, setPlayerCount] = useState(4),
    [replayCursor, setReplayCursor] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [debugTab, setDebugTab] = useState('events');
  const replay = useMemo(() => exportReplay(session.state), [session.state]);
  const state = useMemo(
    () => (replayCursor === null ? session.state : replayGame(replay, replayCursor)),
    [session.state, replay, replayCursor],
  );
  const isHuman = state.players[state.activePlayerId].agent === 'human' && replayCursor === null;
  const actions = useMemo(() => legalActions(state), [state]);
  const ranked = useMemo(
    () => (state.phase === 'setup-settlement' ? rankPlacements(state, actions) : []),
    [state, actions],
  );
  const candidates = useMemo(
    () =>
      showCandidates && isHuman && (settings.mode === 'guided' || settings.mode === 'socratic')
        ? ranked.slice(0, 3).flatMap((e, i) =>
            e.action.type === 'buildSettlement'
              ? [
                  {
                    vertexId: e.action.vertexId,
                    label: String.fromCharCode(65 + i),
                    score: e.evaluation,
                  },
                ]
              : [],
          )
        : [],
    [showCandidates, isHuman, ranked, settings.mode],
  );
  const boardActions = useMemo(
    () =>
      !isHuman
        ? []
        : actions.filter(
            (a) =>
              state.phase.startsWith('setup') ||
              state.phase === 'blocker' ||
              (buildMode === 'road' && a.type === 'buildRoad') ||
              (buildMode === 'settlement' && a.type === 'buildSettlement') ||
              (buildMode === 'city' && a.type === 'upgradeCity'),
          ),
    [actions, state.phase, buildMode, isHuman],
  );
  const dispatch = useCallback((command: GameCommand) => {
    setSession((previous) => {
      const result = applyCommand(previous.state, command);
      if (!result.ok) {
        setError(result.error);
        return previous;
      }
      const records =
        previous.state.phase === 'setup-settlement' &&
        command.type === 'buildSettlement' &&
        previous.state.players[command.playerId].agent === 'human'
          ? [
              ...previous.records,
              recordDecision(previous.state, command, legalActions(previous.state)),
            ]
          : previous.records;
      return { state: applyEvents(previous.state, result.value), records };
    });
    setSelected(null);
    setBuildMode(null);
    setError('');
  }, []);
  useEffect(() => {
    try {
      saveSession(session);
      if (session.state.winner) archiveSession(session);
    } catch {
      setError(
        'This device could not save the game. Export your replay from the Replay room to keep it.',
      );
    }
  }, [session]);
  useEffect(() => {
    try {
      localStorage.setItem('hextutor.settings.v1', JSON.stringify(settings));
    } catch {
      /* Gameplay continues when browser storage is unavailable. */
    }
  }, [settings]);
  useEffect(() => {
    if (replayCursor !== null || dialog || session.state.winner || view !== 'play') return;
    const s = session.state,
      recipient = s.trade?.to,
      actor = recipient && s.players[recipient].agent !== 'human' ? recipient : s.activePlayerId;
    if (s.players[actor].agent === 'human') return;
    const timer = window.setTimeout(() => {
      const options = legalActions(s, actor);
      if (options.length) dispatch(chooseHeuristicAction(s, options));
    }, settings.botSpeed);
    return () => window.clearTimeout(timer);
  }, [session.state, settings.botSpeed, replayCursor, dialog, view, dispatch]);
  useEffect(() => {
    if (!playing || replayCursor === null) return;
    if (replayCursor >= replay.commands.length) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setReplayCursor((c) => (c === null ? null : Math.min(c + 1, replay.commands.length))),
      700,
    );
    return () => window.clearTimeout(timer);
  }, [playing, replayCursor, replay.commands.length]);
  const restart = (sameSeed = false) => {
    try {
      if (session.state.history.length) archiveSession(session);
    } catch {
      /* The current game is still available for export until replacement. */
    }
    const players = sameSeed
      ? replay.players
      : DEFAULT_PLAYERS.slice(0, playerCount).map((p) => ({
          ...p,
          agent: opponents === 'hotseat' ? ('human' as const) : p.agent,
        }));
    setSession({
      state: createGame(sameSeed ? session.state.seed : seed.trim() || 'a-little-wiser', players),
      records: [],
    });
    setReplayCursor(null);
    setPlaying(false);
    setSelected(null);
    setBuildMode(null);
    setShowCandidates(false);
    setDialog(null);
    setView('play');
    setError('');
  };
  const showReplay = () => {
    setReplayCursor(0);
    setPlaying(false);
    setSelected(null);
    setView('play');
  };
  function loadSaved(next: Session) {
    try {
      if (session.state.history.length) archiveSession(session);
      setSession(next);
      showReplay();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load replay');
    }
  }
  return {
    session,
    setSession,
    settings,
    setSettings,
    view,
    setView,
    dialog,
    setDialog,
    selected,
    setSelected,
    buildMode,
    setBuildMode,
    showCandidates,
    setShowCandidates,
    error,
    setError,
    seed,
    setSeed,
    opponents,
    setOpponents,
    playerCount,
    setPlayerCount,
    replayCursor,
    setReplayCursor,
    playing,
    setPlaying,
    debugTab,
    setDebugTab,
    replay,
    state,
    isHuman,
    actions,
    candidates,
    boardActions,
    dispatch,
    restart,
    showReplay,
    loadSaved,
  };
}
export type GameController = ReturnType<typeof useGameSession>;
