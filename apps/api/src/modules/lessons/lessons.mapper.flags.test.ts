import { describe, expect, it } from 'vitest';
import { storedConflicts, toLessonView } from './lessons.mapper';
import { lessonRow } from './lessons.fakes';

const ctx = { role: 'admin' as const, seq: new Map<string, number>() };
const CLASH = { kind: 'teacher_busy', startsAt: '2026-11-01T15:00:00.000Z', endsAt: '2026-11-01T16:00:00.000Z', lessonId: 'x' };
const proposal = (status: 'pending' | 'approved' | 'rejected') => ({
  id: `p-${status}`,
  proposed_starts_at: '2026-10-05 15:00:00+00',
  note: 'عندي ظرف',
  status,
  created_at: '2026-10-02 08:00:00+00',
});

describe('toLessonView — generation clashes and the pending proposal (R-SCH-04, R-SCH-08)', () => {
  it('stored clashes come back as Conflict[]; none → []', () => {
    expect(toLessonView(lessonRow({ conflicts: [CLASH] }), ctx).conflicts).toEqual([CLASH]);
    expect(toLessonView(lessonRow(), ctx).conflicts).toEqual([]);
  });

  it('an unreadable conflicts value is treated as none', () => {
    expect(storedConflicts({ kind: 'nope' })).toEqual([]);
    expect(storedConflicts([{ kind: 'teacher_busy' }])).toEqual([]);
  });

  it('only a pending proposal is shown, with ISO instants', () => {
    const view = toLessonView(lessonRow({ proposals: [proposal('rejected'), proposal('pending')] }), ctx);
    expect(view.pending_proposal).toEqual({
      id: 'p-pending',
      proposed_starts_at: '2026-10-05T15:00:00.000Z',
      note: 'عندي ظرف',
      created_at: '2026-10-02T08:00:00.000Z',
    });
    expect(toLessonView(lessonRow({ proposals: [proposal('approved')] }), ctx).pending_proposal).toBeNull();
  });

  it('a lesson cancelled or held since the proposal shows none (approving would 409)', () => {
    const row = lessonRow({ status: 'cancelled_by_admin', proposals: [proposal('pending')] });
    expect(toLessonView(row, ctx).pending_proposal).toBeNull();
  });
});
