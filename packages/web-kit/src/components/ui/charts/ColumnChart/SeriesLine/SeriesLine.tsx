import type { SeriesLineProps } from './SeriesLine.types';

/** Drawn left to right and mirrored in RTL, so the oldest month stays at inline-start. */
export function SeriesLine({ points }: SeriesLineProps) {
  return (
    <svg
      data-series-line
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full overflow-visible rtl:-scale-x-100"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
