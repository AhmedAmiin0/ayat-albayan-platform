import type { GradePoint } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { CHART_MAX_POINTS, chartPoints, gradeOfScore, segments, tooltipAnchor, yOf } from './chart';
import { gradeWord, seriesLabel } from './chart-labels';

const point = (i: number, overall: number | null, tajweed: number | null = 3): GradePoint => ({
  report_id: `r${i}`,
  lesson_id: `l${i}`,
  starts_at: `2026-10-${String(i + 1).padStart(2, '0')}T13:00:00.000Z`,
  overall,
  rubrics: { recitation: 5, memorization: 4, revision: 3, tajweed, engagement: 2, commitment: 1 },
});

describe('grade chart geometry (R-REP-05)', () => {
  it('ممتاز sits on top, يحتاج إلى مراجعة at the bottom; scores map back to grades', () => {
    expect([5, 4, 3, 2, 1].map(yOf)).toEqual([0, 25, 50, 75, 100]);
    expect([5, 1].map(gradeOfScore)).toEqual(['excellent', 'needs_review']);
    expect(gradeWord(4)).toBe('جيد جدًا');
    expect(gradeWord(null)).toBe('بدون تقييم');
  });

  it('points spread evenly oldest → newest; the chosen series is plotted', () => {
    const pts = chartPoints([point(0, 5), point(1, 3), point(2, null)], 'overall');
    expect(pts.map((p) => [p.pos, p.score, p.y])).toEqual([[0, 5, 0], [50, 3, 50], [100, null, null]]);
    expect(chartPoints([point(0, 5, 2)], 'tajweed')[0]).toMatchObject({ pos: 50, score: 2, y: 75 });
    expect(seriesLabel('overall')).toBe('التقدير العام للحلقة');
    expect(seriesLabel('tajweed')).toBe('التجويد');
  });

  it('only the most recent reports are drawn', () => {
    const many = Array.from({ length: CHART_MAX_POINTS + 5 }, (_, i) => point(i % 28, 4));
    const pts = chartPoints(many, 'overall');
    expect(pts).toHaveLength(CHART_MAX_POINTS);
    expect(pts[0]?.id).toBe(many[5]?.report_id);
  });

  it('an ungraded report breaks the line into runs', () => {
    const pts = chartPoints([point(0, 5), point(1, 4), point(2, null), point(3, 2)], 'overall');
    expect(segments(pts).map((run) => run.map((p) => p.id))).toEqual([['r0', 'r1'], ['r3']]);
    expect(segments([])).toEqual([]);
  });

  it('tooltips hang inward near the edges', () => {
    expect([0, 50, 100].map(tooltipAnchor)).toEqual(['start', 'center', 'end']);
  });
});
