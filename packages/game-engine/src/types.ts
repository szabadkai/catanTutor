import type { PlayerId, Resource, ResourceBag } from '@hextutor/shared';
import type { Topology } from './topology';
export type Phase = 'setup-settlement' | 'setup-road' | 'roll' | 'blocker' | 'main' | 'finished';
export type BuildType = 'road' | 'settlement' | 'city';
export interface GameRules {
  version: string;
  maxPlayers: number;
  minPlayers: number;
  victoryPointsToWin: number;
  handLimit: number;
  costs: Record<BuildType, Partial<ResourceBag>>;
  pieceLimits: Record<BuildType, number>;
  bankSupply: number;
  bankRatio: number;
  portRatio: number;
  specialPortRatio: number;
  networkMinimum: number;
  networkPoints: number;
  boardGeneration: { radius: number; resources: Record<Resource, number>; tokens: number[] };
  probabilityModel: { sides: number };
}
export interface Tile {
  id: string;
  resource: Resource | null;
  token: number | null;
}
export interface Port {
  edgeId: string;
  vertices: [string, string];
  resource: Resource | null;
}
export interface BoardState extends Topology {
  tiles: Record<string, Tile>;
  ports: Port[];
}
export interface PlayerSpec {
  id: PlayerId;
  name: string;
  color: string;
  agent: 'human' | 'heuristic' | 'random';
}
export interface PlayerState extends PlayerSpec {
  resources: ResourceBag;
}
export interface Building {
  playerId: PlayerId;
  level: 1 | 2;
}
export interface TradeOffer {
  from: PlayerId;
  to: PlayerId;
  give: Resource;
  receive: Resource;
  giveAmount: number;
  receiveAmount: number;
}
export type GameCommand = { playerId: PlayerId } & (
  | { type: 'buildSettlement'; vertexId: string }
  | { type: 'buildRoad'; edgeId: string }
  | { type: 'upgradeCity'; vertexId: string }
  | { type: 'rollDice' }
  | { type: 'moveBlocker'; hexId: string; victimId?: PlayerId }
  | { type: 'bankTrade'; give: Resource; receive: Resource }
  | {
      type: 'proposeTrade';
      to: PlayerId;
      give: Resource;
      receive: Resource;
      giveAmount: number;
      receiveAmount: number;
    }
  | { type: 'acceptTrade' }
  | { type: 'rejectTrade' }
  | { type: 'endTurn' }
);
export interface GameState {
  version: 1;
  seed: string;
  rules: GameRules;
  rngState: number;
  board: BoardState;
  players: Record<PlayerId, PlayerState>;
  order: PlayerId[];
  activePlayerId: PlayerId;
  phase: Phase;
  turn: number;
  setupIndex: number;
  lastSetupVertex: string | null;
  buildings: Record<string, Building>;
  roads: Record<string, PlayerId>;
  bank: ResourceBag;
  blockerHexId: string;
  dice: [number, number] | null;
  trade: TradeOffer | null;
  longestNetwork: { holder: PlayerId | null; lengths: Record<PlayerId, number> };
  winner: PlayerId | null;
  history: GameEvent[];
}
export type StatePatch = Partial<
  Omit<GameState, 'history' | 'board' | 'rules' | 'seed' | 'version' | 'order'>
>;
export interface GameEvent {
  id: number;
  type: GameCommand['type'];
  command: GameCommand;
  message: string;
  patch: StatePatch;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export interface GameReplay {
  engineVersion: '0.1.0';
  rulesetVersion: string;
  rules: GameRules;
  seed: string;
  players: PlayerSpec[];
  commands: { at: number; command: GameCommand }[];
}
/** 0.1 is a local, open-hand teaching ruleset. Network secrecy is a later boundary. */
export type PublicGameState = GameState;
