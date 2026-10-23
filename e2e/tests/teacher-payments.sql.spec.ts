import { expect, test } from '@playwright/test';
import { earningId, earningOf, pastLesson, pay, teacherWithRates } from '../support/earnings';
import { rolledBack } from '../support/rls';
import { resetAbrar } from '../support/schedule';

// record_teacher_payment and settle_payout_in_ledger (migration 178) against the real database.

const refused = (p: Promise<unknown>) => p.then(() => 'allowed', (e: { message?: string }) => e.message);

test.describe('record_teacher_payment / settle_payout_in_ledger (migration 178)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'database only: one run');
    // Start from a teacher with no lessons: the CI shard plan may run a spec that leaves one first.
    await resetAbrar();
  });

  test('one payment covers several sessions; partial payments move the status', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const b = await pastLesson(tx, { teacher: t.id, minutes: 60, status: 'completed', daysAgo: 3 });
      const [ea, eb] = [await earningId(tx, a), await earningId(tx, b)];
      await pay(tx, { teacher: t.id, amount: 100, items: [{ earning_id: ea, amount: 70 }, { earning_id: eb, amount: 30 }] });
      expect(await earningOf(tx, a)).toMatchObject({ paid_amount: '70.00', status: 'paid' });
      expect(await earningOf(tx, b)).toMatchObject({ paid_amount: '30.00', status: 'partially_paid' });
      await pay(tx, { teacher: t.id, amount: 60, items: [{ earning_id: eb, amount: 60 }] });
      expect(await earningOf(tx, b)).toMatchObject({ paid_amount: '90.00', status: 'paid' });
      const [row] = await tx<{ n: string }[]>`select count(*) as n from public.teacher_payment_items where earning_id = ${eb}`;
      expect(row?.n).toBe('2');
    });
  });

  test('refuses an overpayment, a mismatched total, a repeated session and another teacher’s session', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const e = await earningId(tx, await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 }));
      const attempt = (amount: number, items: { earning_id: string; amount: number }[], teacher = t.id) =>
        refused(tx.savepoint(() => pay(tx, { teacher, amount, items })));
      expect(await attempt(70.01, [{ earning_id: e, amount: 70.01 }])).toBe('overpayment');
      expect(await attempt(50, [{ earning_id: e, amount: 40 }])).toBe('allocation_mismatch');
      expect(await attempt(20, [{ earning_id: e, amount: 10 }, { earning_id: e, amount: 10 }])).toBe('allocation_invalid');
      expect(await attempt(10, [{ earning_id: e, amount: 10 }], '00000000-0000-4000-8000-000000000000')).toBe('earning_not_found');
      const [row] = await tx<{ paid: string }[]>`select paid_amount as paid from public.teacher_session_earnings where id = ${e}`;
      expect(row?.paid).toBe('0.00');
    });
  });

  test('the same client_request_id returns the recorded payment and pays nothing twice', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const e = await earningId(tx, await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 }));
      const request = '6f000000-0000-4000-8000-000000000099';
      const first = await pay(tx, { teacher: t.id, amount: 30, items: [{ earning_id: e, amount: 30 }], request });
      const again = await pay(tx, { teacher: t.id, amount: 30, items: [{ earning_id: e, amount: 30 }], request });
      expect(first?.replayed).toBe(false);
      expect(again).toEqual({ payment_id: first?.payment_id, replayed: true });
      const [row] = await tx<{ paid: string }[]>`select paid_amount as paid from public.teacher_session_earnings where id = ${e}`;
      expect(row?.paid).toBe('30.00');
    });
  });

  test('marking a monthly payout paid settles only what is outstanding on its lessons, once', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 4 });
      const b = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 3 });
      await pay(tx, { teacher: t.id, amount: 70, items: [{ earning_id: await earningId(tx, a), amount: 70 }] });
      const [po] = await tx<{ id: string }[]>`insert into public.teacher_payouts
        (teacher_id, month, lessons_count, amount, status, approved_at, breakdown)
        values (${t.id}, '2031-03-01', 2, 140, 'approved', now(), ${tx.json({ lesson_ids: [a, b] })}) returning id`;
      const call = () => tx<{ id: string | null }[]>`select public.settle_payout_in_ledger(${po?.id ?? ''}, null, now()) as id`;
      const [first] = await call();
      const [second] = await call();
      expect(second?.id).toBe(first?.id);
      const [sum] = await tx<{ amount: string }[]>`select amount from public.teacher_payments where payout_id = ${po?.id ?? ''}`;
      expect(sum?.amount).toBe('70.00'); // a was already paid per session
      expect(await earningOf(tx, b)).toMatchObject({ paid_amount: '70.00', status: 'paid' });
    });
  });

  test('backfill: a payout that was already paid leaves its sessions paid, not owed again', async () => {
    await rolledBack(async (tx) => {
      const t = await teacherWithRates(tx);
      const a = await pastLesson(tx, { teacher: t.id, minutes: 45, status: 'completed', daysAgo: 40 });
      await tx`insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at, paid_at, breakdown)
        values (${t.id}, '2031-04-01', 1, 70, 'paid', now(), now(), ${tx.json({ lesson_ids: [a] })})`;
      await tx`select public.settle_payout_in_ledger(p.id, null, p.paid_at) from public.teacher_payouts p where p.status = 'paid' and p.teacher_id = ${t.id}`;
      expect(await earningOf(tx, a)).toMatchObject({ status: 'paid', paid_amount: '70.00' });
    });
  });
});
