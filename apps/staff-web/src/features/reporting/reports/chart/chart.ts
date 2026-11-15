import { GRADES, REPORT_RUBRICS, type Grade, type GradePoint, type Rubric } from '@ab/shared';

// Geometry of the grade progress chart (R-REP-05): one series at a time on a 1..5 ordinal axis,
// reports evenly spaced oldest → newest along the inline axis. Percentages, so the chart is fluid.

export type SeriesKey = 'overall' | Rubric;
export const SERIES_KEYS: readonly SeriesKey[] = ['overall', ...REPORT_RUBRICS];

/** At most this many recent reports are drawn; the list below keeps every one. */
export const CHART_MAX_POINTS = 30;

export interface ChartPoint {
  id: string;
  at: string;
  /** gradeScore: 5 = ممتاز … 1 = يحتاج إلى مراجعة; null = not graded (absent / excused). */
  score: number | null;
  /** 0 = oldest (inline-start) … 100 = newest. */
  pos: number;
  /** 0 = top (ممتاز) … 100 = bottom; null when not graded. */
  y: number | null;
}

/** 5 → 0 % (top) … 1 → 100 % (bottom). */
export const yOf = (score: number): number => ((5 - score) / 4) * 100;

/** The grade a score stands for (inverse of gradeScore). */
export const gradeOfScore = (score: number): Grade | undefined => GRADES[5 - score];

export function chartPoints(series: readonly GradePoint[], key: SeriesKey): ChartPoint[] {
  const shown = series.slice(-CHART_MAX_POINTS);
  const last = shown.length - 1;
  return shown.map((p, i) => {
    const score = key === 'overall' ? p.overall : p.rubrics[key];
    return {
      id: p.report_id,
      at: p.starts_at,
      score,
      pos: last === 0 ? 50 : (i / last) * 100,
      y: score === null ? null : yOf(score),
    };
  });
}

/** Runs of consecutive graded points: an ungraded report breaks the line instead of bridging it. */
export function segments(points: readonly ChartPoint[]): ChartPoint[][] {
  const out: ChartPoint[][] = [];
  let run: ChartPoint[] = [];
  for (const p of points) {
    if (p.y === null) {
      if (run.length > 0) out.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length > 0) out.push(run);
  return out;
}

/** Where a tooltip hangs off its point so it stays inside the plot near the edges. */
export function tooltipAnchor(pos: number): 'start' | 'center' | 'end' {
  return pos < 15 ? 'start' : pos > 85 ? 'end' : 'center';
}
