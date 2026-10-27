import { describe, expect, it } from 'vitest';
import type { HistoryBundle } from '../../sales';
import { toStudentDetails } from './sales-student.mapper';
import type { DetailsStudentRow } from './sales-student.queries';

const student = { id: 's1', code: null, name: 'ياسمين', status: 'trial', program: 'quran', teacher: null, guardian: null } as DetailsStudentRow;
const sub = (id: string, status: string, starts_on: string) => ({ id, package: '8', status, starts_on, renews_on: null, lessons_total: 8, created_at: `${starts_on}T00:00:00Z` });
const history = (subs: ReturnType<typeof sub>[]) =>
  ({ student: { id: 's1', code: null, name: 'ياسمين' }, subscriptions: subs, balances: [], payments: [], audit: [] }) as unknown as HistoryBundle;
const parts = (h: HistoryBundle | null) => ({ student, history: h, lessons: [], reports: { items: [], total: 0 }, schedule: { student_tz: 'Africa/Cairo', weekly: [], upcoming: [] } });

describe('toStudentDetails', () => {
  it('current = the newest active subscription, else the newest one', () => {
    const active = toStudentDetails(parts(history([sub('a', 'active', '2026-08-01'), sub('b', 'unpaid', '2026-10-01')])));
    expect(active.subscriptions.map((s) => s.id)).toEqual(['b', 'a']);
    expect(active.current_id).toBe('a');
    expect(toStudentDetails(parts(history([sub('a', 'expired', '2026-08-01'), sub('b', 'unpaid', '2026-10-01')]))).current_id).toBe('b');
  });

  it('a student with no subscription (a trial): empty list, no current, zero totals, code never null', () => {
    const d = toStudentDetails(parts(null));
    expect(d).toMatchObject({ subscriptions: [], current_id: null, attendance: { items: [], totals: { present: 0, absent: 0 } } });
    expect(d.student).toEqual({ id: 's1', code: '', name: 'ياسمين', status: 'trial', program: 'quran', teacher_name: null, guardian_phone: null });
    const withPhone = toStudentDetails({ ...parts(null), student: { ...student, guardian: { phone_e164: '+201001112223' } } });
    expect(withPhone.student.guardian_phone).toBe('+201001112223');
  });

  it('lessons used / left fall back to the total when the balance view has no row', () => {
    expect(toStudentDetails(parts(history([sub('a', 'active', '2026-08-01')]))).subscriptions[0]).toMatchObject({ lessons_used: 0, lessons_remaining: 8 });
  });
});
