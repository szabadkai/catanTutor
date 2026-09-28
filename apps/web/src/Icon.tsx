import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
  hex: 'm12 2 9 5v10l-9 5-9-5V7Z M12 7l4.5 2.5v5L12 17l-4.5-2.5v-5Z',
  play: 'm9 5 10 7-10 7Z',
  book: 'M12 5C9 2 5 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v15',
  chart: 'M4 20h17M6 15v-4m6 4V5m6 10V8',
  replay: 'M3 10a9 9 0 1 1 1 8M3 4v6h6m3-4v6l4 2',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  info: 'M12 11v6m0-10v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  road: 'M4 20 10 4m4 16 6-16M12 8l1-3m-4 11 1-3',
  home: 'm3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7',
  city: 'M3 21V7h7v14m0-10h5V3h6v18M1 21h22M6 10v2m0 3v2m12-11v2m0 3v2m0 3v2',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 7h.1m9.9 0h.1M12 12h.1M7 17h.1m9.9 0h.1',
  trade: 'M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5',
  check: 'm5 12 4 4L19 6',
  trophy: 'M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v4a4 4 0 0 0 5 4m9-8h4v4a4 4 0 0 1-5 4m-4 1v6m-5 1h10',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  leaf: 'M20 3C8 2 2 8 5 15s17 6 15-12ZM5 20 16 8',
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] ?? paths.hex} />
    </svg>
  );
}
