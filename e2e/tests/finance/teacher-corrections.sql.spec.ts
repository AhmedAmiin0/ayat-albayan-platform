import { expect, test } from '@playwright/test';
import { earningId, earningOf, pastLesson, pay, teacherWithRates } from '../../support/finance/earnings';
import { approvedPayout } from '../../support/finance/pay-rule';
import { rolledBack } from '../../support/rls';
import { resetAbrar } from '../../support/core/schedule';

// Correcting money out to a teacher (migration 20261005000201), each case rolled back.

const refused = (p: Promise<unknown>) => p.then(() => 'allowed', (e: { message?: string }) => e.message);
type PayoutState = { status: string; paid_at: string | null; method: string | null; receipt_path: string | null };
const payoutOf = async (tx: Parameters<Parameters<typeof rolledBack>[0]>[0], id: string) =>
  (await tx<PayoutState[]>`select status, paid_at, method, receipt_path from public.teacher_payouts where id = ${id}`)[0];

test.describe('teacher payment corrections (20261005000201)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
    // Start from a teacher with no lessons: the CI shard plan may run a spec that leaves one first.
    await resetAbrar();
  });

  test('voiding a payment reverses its allocations, keeps it in the history and is audited once', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const b = await pastLesson(tx, { teacher: t.id, minutes: 60, status: 'completed', daysAgo: 3 });
      const items = [{ earning_id: await earningId(tx, a), amount: 70 }, { earning_id: await earningId(tx, b), amount: 30 }];
      const r = await pay(tx, { teacher: t.id, amount: 100, items });
      const id = r?.payment_id ?? '';
      await tx`select public.void_teacher_payment(${id}, null, 'مبلغ خطأ')`;
      expect(await earningOf(tx, a)).toMatchObject({ paid_amount: '0.00', status: 'earned' });
      expect(await earningOf(tx, b)).toMatchObject({ paid_amount: '0.00', status: 'earned' });
      const [p] = await tx<{ void_reason: string; voided: boolean }[]>`select void_reason, voided_at is not null as voided
        from public.teacher_payments where id = ${id}`;
      expect(p).toEqual({ void_reason: 'مبلغ خطأ', voided: true });
      expect(await refused(tx.savepoint((s) => s`select public.void_teacher_payment(${id}, null, 'مرة أخرى')`))).toBe('already_voided');
      const [n] = await tx<{ n: string }[]>`select count(*) as n from public.audit_log where entity_id = ${id} and action = 'void'`;
      expect(n?.n).toBe('1');
    });
  });

  test('a capped session (lesson no longer counts) disappears when its only payment is voided', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const l = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 });
      const r = await pay(tx, { teacher: t.id, amount: 30, items: [{ earning_id: await earningId(tx, l), amount: 30 }] });
      await tx`update public.lessons set status = 'excused' where id = ${l}`;
      expect(await earningOf(tx, l)).toMatchObject({ amount: '30.00', status: 'paid' });
      await tx`select public.void_teacher_payment(${r?.payment_id ?? ''}, null, 'الحلقة لم تُحتسب')`;
      expect(await earningOf(tx, l)).toBeUndefined();
    });
  });

  test('pay_payout settles the ledger and marks the payout paid in one call, with method and receipt', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const po = await approvedPayout(tx, { teacher: t.id, lessons: [a], amount: 70 });
      const p = { paid_at: new Date().toISOString(), method: 'bank', note: 'تحويل', receipt_path: `${t.id}/r.jpg` };
      await tx`select public.pay_payout(${po}, null, ${tx.json(p)})`;
      expect(await payoutOf(tx, po)).toMatchObject({ status: 'paid', method: 'bank', receipt_path: `${t.id}/r.jpg` });
      expect(await earningOf(tx, a)).toMatchObject({ status: 'paid' });
      const [pm] = await tx<{ method: string }[]>`select method from public.teacher_payments where payout_id = ${po}`;
      expect(pm?.method).toBe('bank');
      expect(await refused(tx.savepoint((s) => s`select public.pay_payout(${po}, null, '{}'::jsonb)`))).toBe('invalid_transition');
    });
  });

  test('un-pay voids the settlement (sessions owed again) and the payout can be paid again; reopen → draft', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const po = await approvedPayout(tx, { teacher: t.id, lessons: [a], amount: 70 });
      await tx`select public.pay_payout(${po}, null, '{}'::jsonb)`;
      await tx`select public.unpay_payout(${po}, null, 'دُفع مرتين')`;
      expect(await payoutOf(tx, po)).toMatchObject({ status: 'approved', paid_at: null });
      expect(await earningOf(tx, a)).toMatchObject({ paid_amount: '0.00', status: 'earned' });
      await tx`select public.pay_payout(${po}, null, '{}'::jsonb)`;
      const [n] = await tx<{ live: string; all: string }[]>`select count(*) filter (where voided_at is null) as live,
        count(*) as all from public.teacher_payments where payout_id = ${po}`;
      expect(n).toEqual({ live: '1', all: '2' });
      expect(await refused(tx.savepoint((s) => s`select public.reopen_payout(${po}, null)`))).toBe('invalid_transition');
      await tx`select public.unpay_payout(${po}, null, 'تصحيح')`;
      await tx`select public.reopen_payout(${po}, null)`;
      expect(await payoutOf(tx, po)).toMatchObject({ status: 'draft' });
    });
  });

  test('the summary view totals what each teacher earned, was paid and is owed', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      // The shared e2e teacher may already have sessions from other specs: compare against before.
      const summary = async () => {
        const [s] = await tx<{ earned: string; paid: string; owed: string; unpaid_sessions: number }[]>`
          select earned, paid, owed, unpaid_sessions from public.v_teacher_earnings_summary where teacher_id = ${t.id}`;
        return { earned: Number(s?.earned ?? 0), paid: Number(s?.paid ?? 0), owed: Number(s?.owed ?? 0), unpaid: Number(s?.unpaid_sessions ?? 0) };
      };
      const before = await summary();
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      await pastLesson(tx, { teacher: t.id, minutes: 60, status: 'completed', daysAgo: 3 });
      await pay(tx, { teacher: t.id, amount: 70, items: [{ earning_id: await earningId(tx, a), amount: 70 }] });
      const after = await summary();
      expect(after.unpaid - before.unpaid).toBe(1);
      expect(after.owed).toBeCloseTo(after.earned - after.paid, 2);
      expect(after.owed - before.owed).toBeCloseTo(90, 2);
    });
  });
});
