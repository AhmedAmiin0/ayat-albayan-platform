import type { TeacherEarningsSummaryView } from '@ab/shared';
import type { SummaryRow } from './corrections.queries';

const cents = (v: number) => Math.round(Number(v) * 100);

/** v_teacher_earnings_summary rows → the «مستحقات المعلمين» view, totals summed in cents (EGP). */
export function toSummaryView(rows: readonly SummaryRow[]): TeacherEarningsSummaryView {
  const sum = (key: 'earned' | 'paid' | 'owed') => rows.reduce((n, r) => n + cents(r[key]), 0) / 100;
  return {
    currency: 'EGP',
    rows: rows.map((r) => ({
      teacher: { id: r.teacher_id, display_name_ar: r.display_name_ar },
      sessions: r.sessions,
      earned: Number(r.earned),
      paid: Number(r.paid),
      owed: Number(r.owed),
      unpaid_sessions: r.unpaid_sessions,
      oldest_unpaid_at: r.oldest_unpaid_at,
    })),
    totals: {
      earned: sum('earned'),
      paid: sum('paid'),
      owed: sum('owed'),
      teachers_owed: rows.filter((r) => cents(r.owed) > 0).length,
    },
  };
}
