import {
  memo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { RESOURCE_LABELS } from '@hextutor/shared';
import type { GameCommand, GameState, Vertex } from '@hextutor/game-engine';
import { TerrainScene } from './Terrain';
const R = 57,
  CX = 380,
  CY = 293;
export const vertexPoint = (v: Vertex): [number, number] => [
  CX + (Math.sqrt(3) / 2) * R * v.x,
  CY + (R / 2) * v.y,
];
interface Candidate {
  vertexId: string;
  label: string;
  score: number;
}
interface BoardProps {
  state: GameState;
  actions: GameCommand[];
  selected: GameCommand | null;
  candidates: Candidate[];
  onSelect: (action: GameCommand) => void;
  showProbabilities: boolean;
  children?: ReactNode;
}
const sameAction = (a: GameCommand | null, b: GameCommand) =>
  JSON.stringify(a) === JSON.stringify(b);
function activate(e: KeyboardEvent<SVGGElement>, fn: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}
function BoardDefinitions() {
  return (
    <defs>
      <linearGradient id="terrain-light" x2=".8" y2="1">
        <stop stopColor="#fff2b0" stopOpacity=".2" />
        <stop offset="1" stopColor="#102f31" stopOpacity=".15" />
      </linearGradient>
      <radialGradient id="ocean-light">
        <stop stopColor="#378e91" />
        <stop offset=".65" stopColor="#1b5d6a" />
        <stop offset="1" stopColor="#113c4d" />
      </radialGradient>
      <linearGradient id="token-face" x2=".6" y2="1">
        <stop stopColor="#fffdf0" />
        <stop offset="1" stopColor="#e7ce98" />
      </linearGradient>
      <filter id="piece-shadow" x="-60%" y="-60%" width="220%" height="240%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#102d2a" floodOpacity=".5" />
      </filter>
      <pattern id="sea-waves" width="90" height="65" patternUnits="userSpaceOnUse">
        <path
          d="M5 19q8-5 16 0t16 0m22 29q8-5 16 0t16 0"
          fill="none"
          stroke="#b2eee1"
          strokeWidth=".8"
          opacity=".13"
        />
        <circle cx="53" cy="8" r=".8" fill="#d9f4dd" opacity=".2" />
      </pattern>
    </defs>
  );
}
export const Board = memo(function Board({
  state,
  actions,
  selected,
  candidates,
  onSelect,
  showProbabilities,
  children,
}: BoardProps) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const settlementActions = actions.filter(
    (a) => a.type === 'buildSettlement' || a.type === 'upgradeCity',
  );
  const roadActions = actions.filter((a) => a.type === 'buildRoad');
  const blockerActions = actions.filter((a) => a.type === 'moveBlocker');
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest('[role="button"]')) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const scale = 760 / (svg.current?.clientWidth ?? 760);
    setPan({
      x: Math.max(-300, Math.min(300, drag.current.px + (e.clientX - drag.current.x) * scale)),
      y: Math.max(-220, Math.min(220, drag.current.py + (e.clientY - drag.current.y) * scale)),
    });
  }
  return (
    <div className={`board-stage${children ? ' with-table-dice' : ''}`}>
      <div className="board-caption">
        <span className="live-dot" /> THE ISLAND{' '}
        <span className="board-caption-sub">Seed · {state.seed}</span>
      </div>
      <svg
        ref={svg}
        className="game-board"
        viewBox="0 0 760 610"
        aria-label="HexTutor island board. Use Tab to select a legal intersection or road."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <BoardDefinitions />
        <rect width="760" height="610" fill="url(#ocean-light)" />
        <rect className="ocean-waves" width="760" height="610" fill="url(#sea-waves)" />
        <g className="sea-decoration" fill="none" stroke="#b9dace" opacity=".3" aria-hidden="true">
          <circle cx="380" cy="293" r="277" strokeWidth=".6" />
          <circle cx="380" cy="293" r="290" strokeWidth=".5" strokeDasharray="2 9" />
          <path
            d="M90 105q6-7 12 0 6-7 12 0m494 320q6-7 12 0 6-7 12 0M594 119q4-5 8 0 4-5 8 0"
            strokeWidth="1.4"
          />
        </g>
        <g
          transform={`translate(${380 + pan.x},${300 + pan.y}) scale(${zoom}) translate(-380,-300)`}
        >
          {/* Stacked silhouettes create one continuous reef, beach and raised island. */}
          {[
            { width: 35, color: '#64bcad', y: 7, opacity: 0.14 },
            { width: 23, color: '#80cabb', y: 6, opacity: 0.3 },
            { width: 12, color: '#123e43', y: 12, opacity: 0.65 },
            { width: 9, color: '#bd975b', y: 5, opacity: 1 },
            { width: 7, color: '#ebd59f', y: 0, opacity: 1 },
          ].map((layer, i) => (
            <g
              key={i}
              transform={`translate(0 ${layer.y})`}
              opacity={layer.opacity}
              aria-hidden="true"
            >
              {Object.values(state.board.hexes).map((h) => (
                <polygon
                  key={h.id}
                  points={h.vertices
                    .map((v) => vertexPoint(state.board.vertices[v]).join(','))
                    .join(' ')}
                  fill={layer.color}
                  stroke={layer.color}
                  strokeWidth={layer.width}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          ))}
          {Object.values(state.board.hexes).map((h) => {
            const tile = state.board.tiles[h.id],
              x = CX + Math.sqrt(3) * R * (h.q + h.r / 2),
              y = CY + 1.5 * R * h.r;
            const pts = h.vertices
              .map((v) => vertexPoint(state.board.vertices[v]).join(','))
              .join(' ');
            const action = blockerActions.find((a) => a.type === 'moveBlocker' && a.hexId === h.id);
            return (
              <g
                key={h.id}
                role={action ? 'button' : undefined}
                tabIndex={action ? 0 : undefined}
                aria-label={
                  action
                    ? `Move warden to ${tile.resource ? RESOURCE_LABELS[tile.resource] : 'barren'} tile ${h.id}`
                    : undefined
                }
                onClick={() => action && onSelect(action)}
                onKeyDown={(e) => action && activate(e, () => onSelect(action))}
                className={action ? 'hex-target' : ''}
              >
                <defs>
                  <clipPath id={`tile-clip-${h.id}`}>
                    <polygon points={pts} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#tile-clip-${h.id})`} className="tile-landscape">
                  <g transform={`translate(${x} ${y})`}>
                    <TerrainScene resource={tile.resource ?? 'barren'} variant={h.q + h.r} />
                  </g>
                </g>
                <polygon
                  points={pts}
                  fill="none"
                  stroke="#f5e4b5"
                  strokeOpacity=".7"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {tile.token ? (
                  <g className="number-token" filter="url(#piece-shadow)">
                    <circle cx={x} cy={y + 13} r="18" fill="#9c7546" />
                    <circle
                      cx={x}
                      cy={y + 10}
                      r="18"
                      fill="url(#token-face)"
                      stroke="#ffffff"
                      strokeOpacity=".8"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="20"
                      fontWeight="750"
                      fill={tile.token === 6 || tile.token === 8 ? '#b64830' : '#35443c'}
                    >
                      {tile.token}
                    </text>
                    {showProbabilities && (
                      <g>
                        {Array.from({ length: 6 - Math.abs(7 - tile.token) }, (_, i) => (
                          <circle
                            key={i}
                            cx={x + (i - (5 - Math.abs(7 - (tile.token ?? 0))) / 2) * 4}
                            cy={y + 22}
                            r="1.25"
                            fill={tile.token === 6 || tile.token === 8 ? '#b64830' : '#7b7461'}
                          />
                        ))}
                      </g>
                    )}
                  </g>
                ) : (
                  <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    fill="#786f57"
                    fontSize="10"
                    letterSpacing="2"
                  >
                    BARREN
                  </text>
                )}
                <text
                  x={x}
                  y={y + 43}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="750"
                  letterSpacing="1.6"
                  fill="#fff9db"
                  paintOrder="stroke"
                  stroke="#203c36"
                  strokeWidth="2"
                  strokeOpacity=".24"
                >
                  {tile.resource ? RESOURCE_LABELS[tile.resource].toUpperCase() : ''}
                </text>
                {state.blockerHexId === h.id && (
                  <g transform={`translate(${x + 26},${y + 10})`}>
                    <path
                      d="M-7 12-4 1q-7-10 4-13Q11-9 4 1l3 11Z"
                      fill="#344d46"
                      stroke="#f2eddb"
                      strokeWidth="1.5"
                    />
                    <title>The warden blocks production on this tile</title>
                  </g>
                )}
                {sameAction(selected, action as GameCommand) && action && (
                  <polygon points={pts} fill="none" stroke="#fff" strokeWidth="5" />
                )}
              </g>
            );
          })}
          {state.board.ports.map((port) => {
            const [a, b] = port.vertices.map((v) => vertexPoint(state.board.vertices[v]));
            const x = (a[0] + b[0]) / 2,
              y = (a[1] + b[1]) / 2,
              dx = x - CX,
              dy = y - CY,
              len = Math.hypot(dx, dy),
              px = x + (dx / len) * 39,
              py = y + (dy / len) * 39;
            return (
              <g key={port.edgeId}>
                <path
                  d={`M${a[0]},${a[1]} L${px},${py} L${b[0]},${b[1]}`}
                  stroke="#d2b983"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                  fill="none"
                />
                <g transform={`translate(${px} ${py - 18})`} aria-hidden="true">
                  <path d="M-10 2H11L6 7H-6Z" fill="#cca571" />
                  <path d="M0-14V2M-1-12-9 0h8Z" fill="#fff1cc" stroke="#fff1cc" strokeWidth="1" />
                  <path d="m2-10 7 10H2Z" fill="#87c7bb" />
                </g>
                <rect
                  x={px - 16}
                  y={py - 7}
                  width="32"
                  height="19"
                  rx="9"
                  fill="#123f4b"
                  stroke="#87b8ac"
                  strokeOpacity=".7"
                />
                <text
                  x={px}
                  y={py + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#fff0cc"
                >
                  {port.resource ? '2:1' : '3:1'}
                </text>
                <text x={px} y={py + 24} textAnchor="middle" fontSize="8" fill="#c5ded0">
                  {port.resource ? RESOURCE_LABELS[port.resource] : 'Any'}
                </text>
                <title>
                  {port.resource ? RESOURCE_LABELS[port.resource] + ' 2:1' : 'General 3:1'} port
                </title>
              </g>
            );
          })}
          {Object.entries(state.roads).map(([id, p]) => {
            const [a, b] = state.board.edges[id].vertices.map((v) =>
              vertexPoint(state.board.vertices[v]),
            );
            return (
              <g key={id}>
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke="#f8ecd9"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <line
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={state.players[p].color}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {roadActions.map((action) => {
            if (action.type !== 'buildRoad') return null;
            const [a, b] = state.board.edges[action.edgeId].vertices.map((v) =>
              vertexPoint(state.board.vertices[v]),
            );
            return (
              <g
                key={action.edgeId}
                role="button"
                tabIndex={0}
                aria-label={`Build road ${action.edgeId}`}
                onClick={() => onSelect(action)}
                onKeyDown={(e) => activate(e, () => onSelect(action))}
                className="road-target"
                style={{ '--road-color': state.players[action.playerId].color } as CSSProperties}
              >
                <title>
                  {state.phase === 'setup-road'
                    ? 'Place your opening road'
                    : 'Build road · 1 timber + 1 clay'}
                </title>
                <rect
                  className="road-hit-area"
                  x="0"
                  y="-12"
                  width={Math.hypot(b[0] - a[0], b[1] - a[1])}
                  height="24"
                  fill="transparent"
                  transform={`translate(${a[0]} ${a[1]}) rotate(${(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI})`}
                />
                <line
                  className="road-preview"
                  pointerEvents="none"
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={sameAction(selected, action) ? '#f7f2de' : '#fcdea0'}
                  strokeWidth="7"
                  strokeDasharray="5 7"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {Object.entries(state.buildings).map(([v, b]) => {
            const [x, y] = vertexPoint(state.board.vertices[v]);
            return (
              <g key={v} transform={`translate(${x},${y})`} filter="url(#piece-shadow)">
                <ellipse cy="9" rx={b.level === 2 ? 17 : 13} ry="5" fill="#163d38" opacity=".4" />
                <g
                  fill={state.players[b.playerId].color}
                  stroke="#fff2ce"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                >
                  <path d="M-10 5V-6L-2-14 7-8V7L-2 12Z" />
                  <path d="m-2-14 12 6 7 9-10-9Z" />
                  <path d="M7-8 17 1v10L7 7Z" />
                  {b.level === 2 && <path d="M-15 7V-13l6-6 7 5V12Z" />}
                </g>
                <path d="M7-6 16 1v9L7 7Z" fill="#163b38" opacity=".3" />
                <path d="M-10-6-2-14 7-8-2-1Z" fill="#fff7d5" opacity=".3" />
                <path d="M-5 9V2l4 2v7" fill="#243d37" opacity=".6" />
                <title>
                  {state.players[b.playerId].name} · {b.level === 2 ? 'city' : 'settlement'}
                </title>
              </g>
            );
          })}
          {settlementActions.map((action) => {
            if (action.type !== 'buildSettlement' && action.type !== 'upgradeCity') return null;
            const [x, y] = vertexPoint(state.board.vertices[action.vertexId]),
              candidate = candidates.find((c) => c.vertexId === action.vertexId),
              chosen = sameAction(selected, action);
            return (
              <g
                key={action.vertexId}
                role="button"
                tabIndex={0}
                aria-label={`${action.type === 'upgradeCity' ? 'Upgrade city' : 'Select settlement'} ${action.vertexId}${candidate ? ` candidate ${candidate.label}, score ${candidate.score}` : ''}`}
                data-testid="settlement-target"
                onClick={() => onSelect(action)}
                onKeyDown={(e) => activate(e, () => onSelect(action))}
                className={`vertex-target ${chosen ? 'selected' : ''}`}
              >
                <circle cx={x} cy={y} r="16" fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={candidate || chosen ? 12 : 5}
                  fill={chosen ? '#fdf8e8' : candidate ? '#174f57' : '#fff5cc'}
                  stroke={candidate || chosen ? '#fff9e5' : '#658576'}
                  strokeWidth={candidate || chosen ? 2 : 1.5}
                />
                {candidate && (
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={chosen ? '#365a46' : '#fff9e5'}
                  >
                    {candidate.label}
                  </text>
                )}
                {chosen && !candidate && <circle cx={x} cy={y} r="5" fill="#4c7256" />}
              </g>
            );
          })}
        </g>
        <g transform="translate(683 503)" opacity=".6">
          <path d="M0 0v44M-22 22h44m-37-15 30 30m0-30-30 30" stroke="#a1c4b6" strokeWidth="1" />
          <path d="m0 5 5 17-5-4-5 4Z" fill="#d7dec0" />
          <text x="0" y="-6" textAnchor="middle" fontSize="9" fill="#d7dec0">
            N
          </text>
        </g>
      </svg>
      {children}
      <div className="board-legend">
        <span>
          <i className="legend-dot" />{' '}
          {roadActions.length ? 'Tap an edge to build a road' : 'Available intersection'}
        </span>
        <span>Drag to pan</span>
      </div>
      <div className="zoom-controls">
        <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.75, z - 0.15))}>
          −
        </button>
        <button
          aria-label="Reset board view"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}>
          +
        </button>
      </div>
    </div>
  );
});
