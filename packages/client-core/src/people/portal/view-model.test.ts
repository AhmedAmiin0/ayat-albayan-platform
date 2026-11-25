import type { PortalHistory, PortalHistoryRow, PortalPackage } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { historyMonths, historyRows } from './history';
import { packageSummary, paymentInstructions, signedAmount } from './package-view';
import { prepareCard } from './prepare';

const row = (over: Partial<PortalHistoryRow> = {}): PortalHistoryRow => ({
  lesson_id: 'l1', starts_at: '2026-10-31T22:30:00.000Z', ends_at: '2026-10-31T23:00:00.000Z',
  teacher: { display_name_ar: 'أبرار', display_name_en: null }, outcome: 'attended',
  absence_reason: null, report_id: null, recording_id: null, ...over,
});
const page = (rows: PortalHistoryRow[], next: string | null = null): PortalHistory => ({
  rows,
  next_cursor: next,
});

describe('historyRows / historyMonths', () => {
  it('joins the pages once each; an excused absence stays in «غاب عنها»', () => {
    const pages = [
      page([row(), row({ lesson_id: 'l2', outcome: 'absent' })], 'c'),
      page([row(), row({ lesson_id: 'l3', outcome: 'excused' })]),
    ];
    expect(historyRows(pages, 'attended').map((r) => r.lesson_id)).toEqual(['l1']);
    expect(historyRows(pages, 'absent').map((r) => r.lesson_id)).toEqual(['l2', 'l3']);
    expect(historyRows(undefined, 'absent')).toEqual([]);
  });

  it('groups by month on the family clock (late on the 31st UTC is November in Riyadh)', () => {
    const rows = [row(), row({ lesson_id: 'l2', starts_at: '2026-10-10T10:00:00.000Z' })];
    expect(historyMonths(rows, 'Asia/Riyadh').map((m) => [m.month, m.rows.length])).toEqual([
      ['2026-11', 1],
      ['2026-10', 1],
    ]);
    expect(historyMonths(rows, 'UTC').map((m) => [m.month, m.rows.length])).toEqual([['2026-10', 2]]);
  });
});

const pkg = (over: Partial<PortalPackage> = {}): PortalPackage => ({
  package: '12', duration: 30, lessons_total: 12, lessons_used: 8, remaining: 4,
  starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active',
  amount_due: { amount: 150, currency: 'SAR' }, ...over,
});

describe('packageSummary', () => {
  it('«8 من 12», what is left, the renewal and the amount due', () => {
    expect(packageSummary(pkg())).toEqual({
      used: 8, total: 12, remaining: 4, renewsOn: '2026-11-01', amountDue: { amount: 150, currency: 'SAR' },
    });
  });

  it('an older API: used from what is left; nothing owed means no amount', () => {
    const old = packageSummary(
      pkg({ lessons_used: undefined, amount_due: undefined, remaining: 14 }),
    );
    expect([old.used, old.amountDue]).toEqual([0, null]);
    expect(packageSummary(pkg({ amount_due: { amount: 0, currency: 'SAR' } })).amountDue).toBeNull();
    expect(packageSummary(pkg({ amount_due: null })).amountDue).toBeNull();
  });

  it('refunds show as a minus; empty instructions are hidden', () => {
    const paid = { paid_at: '2026-10-01', amount: 300, currency: 'SAR' };
    expect(signedAmount({ ...paid, kind: 'payment' })).toBe(300);
    expect(signedAmount({ ...paid, kind: 'refund' })).toBe(-300);
    const view = { package: null, payments: [] };
    expect(paymentInstructions({ ...view, payment_instructions: '  ' })).toBeNull();
    expect(paymentInstructions({ ...view, payment_instructions: ' IBAN 1 ' })).toBe('IBAN 1');
  });
});

describe('prepareCard «ما المطلوب»', () => {
  const prepare = { homework: 'سورة الملك', next_plan: '  ', report_id: 'r1', lesson_starts_at: null };
  it('keeps the filled texts and hides the empty ones', () => {
    expect(prepareCard({ prepare })).toEqual({ homework: 'سورة الملك', nextPlan: null, reportId: 'r1' });
  });

  it('no sent report, an older API, or both texts empty: no card', () => {
    expect(prepareCard({ prepare: null })).toBeNull();
    expect(prepareCard({})).toBeNull();
    expect(prepareCard({ prepare: { ...prepare, homework: null, next_plan: '' } })).toBeNull();
  });
});
