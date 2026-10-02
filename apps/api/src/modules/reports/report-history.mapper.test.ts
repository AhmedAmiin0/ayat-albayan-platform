import { describe, expect, it } from 'vitest';
import { historyResponse, pendingViews } from './report-history.mapper';
import type { HistoryRow, PendingRow } from './report-history.queries';
import { TEACHER_ID } from './reports.fakes';

function row(id: string, over: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id,
    lesson_id: `l-${id}`,
    teacher_id: TEACHER_ID,
    attendance: 'on_time',
    grade_recitation: 'excellent',
    grade_memorization: 'very_good',
    grade_revision: 'good',
    grade_tajweed: 'acceptable',
    grade_engagement: 'needs_review',
    grade_commitment: null,
    grade_overall: 'very_good',
    status: 'submitted',
    version: 1,
    pdf_status: 'ready',
    sent_at: null,
    ...over,
  };
}
const lesson = (id: string, day: number) => ({
  id: `l-${id}`,
  starts_at: `2026-10-0${day}T14:00:00+00:00`,
  teacher: { id: TEACHER_ID, display_name_ar: 'أبرار' },
});

describe('historyResponse (R-REP-05, issue D2)', () => {
  const rows = [row('b'), row('a', { grade_overall: 'good' }), row('c')];
  const lessons = [lesson('a', 1), lesson('b', 3), lesson('c', 5)];
  const seq = new Map([['l-a', 7], ['l-b', 8]]);

  it('items: newest lesson first, paginated; total counts them all; lesson_no from the sequence', () => {
    const out = historyResponse({ rows, lessons, seq, page: { page: 1, pageSize: 2 } });
    expect(out.items.map((i) => i.id)).toEqual(['c', 'b']);
    expect(out).toMatchObject({ total: 3, page: 1, pageSize: 2 });
    expect(out.items[0]).toMatchObject({ lesson_no: null, starts_at: '2026-10-05T14:00:00.000Z', teacher: { display_name_ar: 'أبرار' } });
    const second = historyResponse({ rows, lessons, seq, page: { page: 2, pageSize: 2 } });
    expect(second.items.map((i) => [i.id, i.lesson_no])).toEqual([['a', 7]]);
  });

  it('series: every report oldest first, grades as 5 = ممتاز … 1, null stays null', () => {
    const out = historyResponse({ rows, lessons, seq, page: { page: 2, pageSize: 2 } });
    expect(out.series.map((p) => [p.report_id, p.overall])).toEqual([['a', 3], ['b', 4], ['c', 4]]);
    expect(out.series[0]?.rubrics).toEqual({
      recitation: 5,
      memorization: 4,
      revision: 3,
      tajweed: 2,
      engagement: 1,
      commitment: null,
    });
  });

  it('a report whose lesson is gone is left out', () => {
    expect(historyResponse({ rows, lessons: [lesson('a', 1)], seq, page: { page: 1, pageSize: 25 } }).total).toBe(1);
  });
});

describe('pendingViews (R11, R-TCH-03)', () => {
  const pending = (lessonId: string, over: Partial<PendingRow> = {}): PendingRow => ({
    lesson_id: lessonId,
    student: { id: 's1', code: 'AB-0001', name: 'سهيلة' },
    lessons: { starts_at: '2026-10-04T14:00:00+00:00', status: 'completed' },
    lesson_reports: null,
    ...over,
  });

  it('keeps lessons without a report or with a draft, drops submitted, oldest first', () => {
    const out = pendingViews([
      pending('l3', { lessons: { starts_at: '2026-10-05T14:00:00+00:00', status: 'scheduled' } }),
      pending('l1', { lesson_reports: { id: 'r1', status: 'draft' } }),
      pending('l2', { lesson_reports: { id: 'r2', status: 'submitted' } }),
    ]);
    expect(out.map((p) => [p.lesson_id, p.report_id, p.status])).toEqual([
      ['l1', 'r1', 'completed'],
      ['l3', null, 'scheduled'],
    ]);
    expect(out[0]).toMatchObject({ starts_at: '2026-10-04T14:00:00.000Z', student: { code: 'AB-0001', name: 'سهيلة' } });
  });
});
