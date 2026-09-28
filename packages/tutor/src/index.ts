import { type TutorConcept } from '@hextutor/shared';
import { stateHash, type GameCommand, type GameState } from '@hextutor/game-engine';
import { evaluateAction, type EvaluatedAction, type EvaluationFactor } from '@hextutor/game-ai';
export interface DecisionAnalysis {
  chosenAction: EvaluatedAction;
  alternatives: EvaluatedAction[];
  quality: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'major-mistake';
  concepts: TutorConcept[];
  explanation: EvaluationFactor[];
  confidence: number;
  skills: { skill: TutorConcept; score: number }[];
}
export interface DecisionRecord {
  turn: number;
  playerId: string;
  stateHashBefore: string;
  chosenAction: GameCommand;
  legalActions: GameCommand[];
  evaluation: DecisionAnalysis;
}
export interface TutorAnalyzer {
  analyzeDecision(
    before: GameState,
    chosenAction: GameCommand,
    candidateActions: GameCommand[],
  ): DecisionAnalysis;
}
export class OpeningPlacementCoach implements TutorAnalyzer {
  analyzeDecision(
    before: GameState,
    chosen: GameCommand,
    candidates: GameCommand[],
  ): DecisionAnalysis {
    const ranked = candidates
      .map((c) => evaluateAction(before, c))
      .sort((a, b) => b.evaluation - a.evaluation);
    const chosenAction = evaluateAction(before, chosen),
      best = ranked[0]?.evaluation ?? chosenAction.evaluation,
      gap = best - chosenAction.evaluation;
    const quality =
      gap <= 3
        ? 'excellent'
        : gap <= 10
          ? 'good'
          : gap <= 20
            ? 'inaccuracy'
            : gap <= 30
              ? 'mistake'
              : 'major-mistake';
    const concepts = [...new Set(chosenAction.factors.map((f) => f.type))];
    return {
      chosenAction,
      alternatives: ranked
        .filter((c) => JSON.stringify(c.action) !== JSON.stringify(chosen))
        .slice(0, 3),
      quality,
      concepts,
      explanation: chosenAction.factors,
      confidence: 0.65,
      skills: concepts.map((skill) => ({ skill, score: Math.max(0, Math.min(1, 1 - gap / 100)) })),
    };
  }
}
export function recordDecision(
  state: GameState,
  chosen: GameCommand,
  legal: GameCommand[],
): DecisionRecord {
  return {
    turn: state.turn,
    playerId: chosen.playerId,
    stateHashBefore: stateHash(state),
    chosenAction: chosen,
    legalActions: legal,
    evaluation: new OpeningPlacementCoach().analyzeDecision(state, chosen, legal),
  };
}
export function rankPlacements(state: GameState, candidates: GameCommand[]): EvaluatedAction[] {
  return candidates
    .filter((c) => c.type === 'buildSettlement')
    .map((c) => evaluateAction(state, c))
    .sort((a, b) => b.evaluation - a.evaluation);
}
