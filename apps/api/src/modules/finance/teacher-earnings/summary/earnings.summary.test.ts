import { describe, expect, it } from 'vitest';
import { toSummaryView } from './earnings.summary';

const row = ({ id, earned, paid, oldest = null }: { id: string; earned: number; paid: number; oldest?: string | null }) => ({
  teacher_id: id,
  display_name_ar: `معلم ${id}`,
  sessions: 3,
  earned,
  paid,
  owed: Math.round((earned - paid) * 100) / 100,
  unpaid_sessions: earned > paid ? 1 : 0,
  oldest_unpaid_at: oldest,
});

describe('toSummaryView («مستحقات المعلمين»)', () => {
  it('maps each teacher and sums the totals in cents', () => {
    const v = toSummaryView([row({ id: 't1', earned: 210.1, paid: 70.05, oldest: '2026-09-02T15:00:00Z' }), row({ id: 't2', earned: 90.2, paid: 90.2 })]);
    expect(v.rows[0]).toEqual({
      teacher: { id: 't1', display_name_ar: 'معلم t1' },
      sessions: 3,
      earned: 210.1,
      paid: 70.05,
      owed: 140.05,
      unpaid_sessions: 1,
      oldest_unpaid_at: '2026-09-02T15:00:00Z',
    });
    expect(v.totals).toEqual({ earned: 300.3, paid: 160.25, owed: 140.05, teachers_owed: 1 });
    expect(v.currency).toBe('EGP');
  });

  it('no teachers → zero totals', () => {
    expect(toSummaryView([]).totals).toEqual({ earned: 0, paid: 0, owed: 0, teachers_owed: 0 });
  });
});
