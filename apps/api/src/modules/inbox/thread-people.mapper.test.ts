import { describe, expect, it } from 'vitest';
import type { BalanceRow } from '../subscriptions/balance.queries';
import { STUDENT_ID, subRow } from '../subscriptions/money.fakes';
import { toStudentBalance, toSubscriptionView } from '../subscriptions/subscriptions.mapper';
import type { SubRow } from '../subscriptions/subscriptions.queries';
import { subscribedGuardianIds, toThreadStudent, type PeopleStudentRow } from './thread-people.mapper';

const STUDENT: PeopleStudentRow = {
  id: STUDENT_ID,
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  teacher: { display_name_ar: 'أبرار' },
};

const unit = (input: { id: string; student?: string; used: number; total: number; last: boolean }): BalanceRow => ({
  subscription_id: input.id,
  student_id: input.student ?? STUDENT_ID,
  lessons_total: input.total,
  lessons_used: input.used,
  remaining: input.total - input.used,
  is_last: input.last,
  ended_at: null,
  projected_end_at: null,
});

/** The real S6 chain: rows + v_subscription_balance + payments → StudentBalanceView. */
function s6(subs: SubRow[], ctx: { balances: BalanceRow[]; paid: Record<string, number> }) {
  const maps = { balances: new Map(ctx.balances.map((b) => [b.subscription_id, b])), paid: new Map(Object.entries(ctx.paid)) };
  return toStudentBalance(STUDENT_ID, subs.map((s) => toSubscriptionView(s, maps)));
}

describe('toThreadStudent (R-SUB-01): the chat’s student card', () => {
  it('no package yet → subscription null; a missing code reads as empty', () => {
    const v = toThreadStudent({ ...STUDENT, code: null, teacher: null }, s6([], { balances: [], paid: {} }));
    expect(v).toEqual({ id: STUDENT_ID, name: 'سهيلة', code: '', teacher_name: null, status: 'active', subscription: null });
  });

  it('early renewal: lessons across both packages (FIFO), money of the newest', () => {
    const old = subRow({ id: 'old', status: 'active' });
    const renewal = subRow({ id: 'new', package: '8', lessons_total: 8, price: 290.5, starts_on: '2026-10-20' });
    const balances = [unit({ id: 'old', used: 2, total: 4, last: false }), unit({ id: 'new', used: 0, total: 8, last: true })];
    const v = toThreadStudent(STUDENT, s6([old, renewal], { balances, paid: { old: 145, new: 100.2 } }));
    expect(v.teacher_name).toBe('أبرار');
    expect(v.subscription).toEqual({
      ...{ id: 'new', status: 'unpaid', package_size: '8', lessons_total: 12, lessons_used: 2, lessons_remaining: 10 },
      ...{ price: 290.5, currency: 'SAR', paid_amount: 100.2, due_amount: 190.3, renews_on: null, starts_on: '2026-10-20' },
    });
  });

  it('paid in full or over → nothing due', () => {
    const v = toThreadStudent(STUDENT, s6([subRow({ status: 'active' })], { balances: [], paid: { [subRow().id]: 150 } }));
    expect([v.subscription?.due_amount, v.subscription?.lessons_remaining]).toEqual([0, 4]);
  });
});

describe('subscribedGuardianIds (H1 «مشترك»)', () => {
  const kid = (id: string, guardian_id: string, subscriptions: SubRow['status'][]) => ({
    id,
    guardian_id,
    subscriptions: subscriptions.map((status, i) => ({ id: `${id}-${i}`, status })),
  });

  it('follows each child’s newest package and units left, per family', () => {
    const students = [
      kid('s1', 'g1', ['unpaid']), // running, money owed
      kid('s2', 'g2', ['unpaid']), // used up: renewal due
      kid('s3', 'g3', []), // no package …
      kid('s4', 'g3', ['expired', 'active']), // … but a sibling's renewal runs
      kid('s5', 'g4', ['active', 'expired']), // newest is expired
      kid('s6', 'g5', ['trial']),
    ];
    const balances = [
      unit({ id: 's1-0', student: 's1', used: 1, total: 4, last: true }),
      unit({ id: 's2-0', student: 's2', used: 4, total: 4, last: true }),
      unit({ id: 's4-0', student: 's4', used: 4, total: 4, last: false }),
      unit({ id: 's4-1', student: 's4', used: 1, total: 8, last: true }),
      unit({ id: 's5-0', student: 's5', used: 4, total: 4, last: false }),
      unit({ id: 's5-1', student: 's5', used: 4, total: 4, last: true }),
      unit({ id: 's6-0', student: 's6', used: 0, total: 1, last: true }),
    ];
    expect([...subscribedGuardianIds(students, balances)]).toEqual(['g1', 'g3']);
  });
});
