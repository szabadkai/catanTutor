import type { Resource } from '@hextutor/shared';

export const TERRAIN_COLORS: Record<Resource | 'barren', string> = {
  wood: '#397b61',
  brick: '#c77b50',
  wool: '#98b963',
  grain: '#dfb34e',
  ore: '#7a929b',
  barren: '#d5b77a',
};

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="5" rx="9" ry="3" fill="#123f37" opacity=".25" />
      <path d="M-1 5V-8" stroke="#795b3d" strokeWidth="3" />
      <path d="M0-27-8-11h4L-12 1 0 5 12 1 4-11h4Z" fill="#194f40" />
      <path d="M0-27-8-11h4L-12 1 0 5Z" fill="#5caa7b" />
      <path
        d="m0-18-5 10 5 2m0 0-7 9"
        fill="none"
        stroke="#90c78c"
        strokeWidth=".7"
        opacity=".65"
      />
    </g>
  );
}
function Sheep({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="5" rx="8" ry="2.5" fill="#4a773a" opacity=".25" />
      <path d="M-4 2v4m7-4v4" stroke="#4b5140" strokeWidth="1.5" />
      <path d="M-7 0q-3-5 2-7 3-4 6-1 6-2 7 3 4 5-2 7-9 4-13-2" fill="#fff9de" />
      <path d="M-6 1q5 3 11-1" fill="none" stroke="#d4d5b6" strokeWidth="2" />
      <ellipse cx="7" cy="-1" rx="2.8" ry="4" fill="#465348" />
      <circle cx="8" cy="-2" r=".6" fill="white" />
    </g>
  );
}

/** Small, resolution-independent landscape shared by the board and resource cards. */
export function TerrainScene({
  resource,
  variant = 0,
}: {
  resource: Resource | 'barren';
  variant?: number;
}) {
  return (
    <g aria-hidden="true">
      <path d="M-54-58H54V58H-54Z" fill={TERRAIN_COLORS[resource]} />
      <path d="M-58-16Q-20-45 14-18T58-26V58H-58Z" fill="#fff0b0" opacity=".13" />
      <path d="M-58 20Q-25-8 12 9T58-4V58H-58Z" fill="#153e34" opacity=".13" />
      {resource === 'wood' && (
        <>
          <path
            d="M-12 58Q23 16 4-6T17-58"
            fill="none"
            stroke="#b0c994"
            strokeWidth="4"
            opacity=".55"
          />
          {[
            [-21, -25, 0.72],
            [5, -31, 0.7],
            [26, -19, 0.82],
            [-34, -5, 0.8],
            [-11, -5, 1.1],
            [14, 5, 1],
            [35, 12, 0.75],
            [-30, 21, 0.85],
            [-13, 38, 0.65],
            [29, 40, 0.65],
          ].map(([x, y, s], i) => (
            <Pine key={i} x={x + (variant % 2) * 3} y={y} scale={s} />
          ))}
        </>
      )}
      {resource === 'ore' && (
        <>
          <path d="m-49 7 22-42L1 9Zm17 5L3-50l39 62Z" fill="#526c79" />
          <path d="M3-50 8 10h34Z" fill="#344d60" />
          <path d="M3-50-14-20-3-24 6-15 11-25 19-24Z" fill="#f0f3e7" />
          <path d="m-27-35-11 21 10-6 7 7 3-4Z" fill="#c5d9d6" />
          <path d="m-7 15 30-48 28 48Z" fill="#6a8790" />
          <path d="m23-33 1 48h27Z" fill="#40596a" />
          <path d="m23-33-11 18 10-3 5 6 7-1Z" fill="#fff5de" />
          <path d="m-41 26 8-12 13 3 7 10-17 6Zm62 15 10-11 13 5-1 9-17 2Z" fill="#a7babc" />
          <Pine x={-38} y={18} scale={0.45} />
          <Pine x={38} y={30} scale={0.45} />
        </>
      )}
      {resource === 'grain' && (
        <>
          <path d="M-55-17 3-39 56-12 8 14Z" fill="#f1cc66" />
          <path
            d="M-55-11 8 19 58-6M-55 4 8 34 58 9M-55 19 8 49 58 24"
            stroke="#997633"
            strokeWidth="2"
            fill="none"
            opacity=".55"
          />
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={`M${-46 + i * 10} ${-13 + i * 5}l35-18`}
              stroke="#a57c2c"
              strokeWidth="1.1"
              opacity=".55"
            />
          ))}
          {[-29, -17, -5, 7, 19, 31].map((x, i) => (
            <g
              key={x}
              transform={`translate(${x} ${-13 + (i % 3) * 5})`}
              stroke="#9a712b"
              strokeWidth="1.2"
              fill="#ffe7a0"
            >
              <path d="M0 6v-21" />
              <path d="M0-2q-9-1-6-7 6 0 6 7Zm0-5q9-1 6-7-6 0-6 7Zm0-5q-6-2-3-6 4 1 3 6Z" />
            </g>
          ))}
          <g transform="translate(29 26)">
            <path d="M-9 5V-5L0-11 9-5V5Z" fill="#f7e3a4" />
            <path d="m-12-5 12-9 12 9Z" fill="#9b563c" />
            <path d="M-2 5v-7h5v7" fill="#795938" />
          </g>
        </>
      )}
      {resource === 'wool' && (
        <>
          <path
            d="M-58 2Q-24-34 17-5T58-5"
            fill="none"
            stroke="#d1df90"
            strokeWidth="15"
            opacity=".45"
          />
          <path d="M-49 29Q-15 6 51 28" fill="none" stroke="#507d45" strokeWidth="1" opacity=".5" />
          <Sheep x={-23} y={-16} />
          <Sheep x={8} y={-23} />
          <Sheep x={28} y={-1} />
          <Sheep x={-29} y={13} />
          {[
            [-35, -28],
            [-9, -35],
            [32, 19],
            [-20, 36],
            [18, 38],
            [36, -18],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path d="M-3 0-4-5M0 0v-6m2 6 3-4" stroke="#628e47" strokeWidth="1" />
              <circle cx="0" cy="-6" r="1.5" fill="#f7e4a2" />
            </g>
          ))}
        </>
      )}
      {resource === 'brick' && (
        <>
          <path d="m-50 0 16-28 27-8 18 18-6 32-30 6Z" fill="#a95236" />
          <path d="m-50 0 16-28 27-8-13 24Z" fill="#edb47b" />
          <path d="m-20-12 13-24 18 18-6 32Z" fill="#cd8153" />
          <path d="m-8 5 18-35 27 6 18 31-32 14Z" fill="#a95a3e" />
          <path d="m-8 5 18-35 27 6-18 19Z" fill="#f0b781" />
          <path d="m19-5 18-19 18 31-32 14Z" fill="#bb704c" />
          <path
            d="m-41-5 21-7m-25 17 22-6m-8 13 10-3M25 4l22-5m-20 12 23-5"
            fill="none"
            stroke="#743d2c"
            strokeWidth="1.5"
            opacity=".55"
          />
          <path d="m-34 32 10-8 12 4-9 9Zm57 4 9-7 12 5-9 7Z" fill="#eab082" />
        </>
      )}
      {resource === 'barren' && (
        <>
          <path d="M-58 7Q-19-50 16-17T58-5V58H-58Z" fill="#ebce8e" />
          <path d="M-58 7Q-19-50 16-17-10-12-17 29Z" fill="#c89b60" />
          <path d="M-58 40Q15-27 58 4V58H-58Z" fill="#f2d69a" />
          <path d="M-58 40Q15-27 58 4 21-8 6 40Z" fill="#b88d55" opacity=".6" />
          <path
            d="M-33 24q16-11 24-9M10-29q11 1 18 6M17 40l17-6"
            stroke="#fff0bc"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}
      <path d="M-54-58H54V58H-54Z" fill="url(#terrain-light)" />
    </g>
  );
}

export function ResourceArt({ resource }: { resource: Resource }) {
  return (
    <svg viewBox="-49 -48 98 86" aria-hidden="true" className="resource-art">
      <TerrainScene resource={resource} />
    </svg>
  );
}
