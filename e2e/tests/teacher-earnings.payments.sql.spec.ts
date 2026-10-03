import { expect, test } from '@playwright/test';
import { as, rolledBack, userId } from '../support/rls';
import { at, earningOf, lesson, pay, teacher } from '../support/earnings';
import { USERS } from '../support/users';

// Migrations 176–179 (per-session teacher earnings) against the real database, in a transaction
// that is rolled back. NOT run in the cloud session that wrote it: the owner runs it locally after
// `supabase db reset`. Each case mirrors a branch of packages/shared/src/money/earnings.plan.ts.

test.describe('teacher earnings payments and RLS (migrations 176–179)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('partial payments, oldest-first items, over-payment refused, idempotent request id', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const a = await earningOf(tx, await lesson(tx, { teacher: t, days: 4, minutes: 60, status: 'completed' }));
      const b = await earningOf(tx, await lesson(tx, { teacher: t, days: 5, minutes: 60, status: 'completed' }));
      if (!a || !b) throw new Error('earnings missing');
      const req = '00000000-0000-4000-8000-0000000000a1';
      const body = { teacher_id: t, method: 'bank', paid_at: at(10), client_request_id: req };
      await pay(tx, { ...body, amount: 120, items: [{ earning_id: a.id, amount: 90 }, { earning_id: b.id, amount: 30 }] });
      const statusOf = async (id: string) =>
        (await tx<{ status: string }[]>`select status from public.teacher_session_earnings where id = ${id}`)[0]?.status;
      expect(await statusOf(a.id)).toBe('paid');
      expect(await statusOf(b.id)).toBe('partially_paid');
      const replay = await pay(tx, { ...body, amount: 120, items: [{ earning_id: a.id, amount: 90 }, { earning_id: b.id, amount: 30 }] });
      expect(JSON.stringify(replay)).toContain('"replayed":true');
      expect(await tx`select 1 from public.teacher_payments where teacher_id = ${t}`).toHaveLength(1);
      await expect(pay(tx, { ...body, client_request_id: null, amount: 61, items: [{ earning_id: b.id, amount: 61 }] })).rejects.toThrow('over_payment');
      await expect(pay(tx, { ...body, client_request_id: null, amount: 5, items: [{ earning_id: a.id, amount: 90 }] })).rejects.toThrow('amount_mismatch');
    });
  });

  test('a fully paid earning is frozen; a partly paid one follows a corrected length and keeps its payments', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const lA = await lesson(tx, { teacher: t, days: 6, minutes: 60, status: 'completed' });
      const lB = await lesson(tx, { teacher: t, days: 7, minutes: 60, status: 'completed' });
      const a = await earningOf(tx, lA);
      const b = await earningOf(tx, lB);
      if (!a || !b) throw new Error('earnings missing');
      const p = { teacher_id: t, method: 'cash', paid_at: at(10) };
      await pay(tx, { ...p, amount: 90, items: [{ earning_id: a.id, amount: 90 }] });
      await pay(tx, { ...p, amount: 30, items: [{ earning_id: b.id, amount: 30 }] });
      await tx`update public.lessons set ends_at = starts_at + interval '90 minutes' where id in (${lA}, ${lB})`;
      expect(await earningOf(tx, lA)).toMatchObject({ minutes: 60, amount: '90.00', status: 'paid' });
      expect(await earningOf(tx, lB)).toMatchObject({ minutes: 90, amount: '120.00', status: 'partially_paid' });
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${lB}`;
      expect(await earningOf(tx, lB)).toMatchObject({ status: 'partially_paid' });
    });
  });

  test('paying a monthly payout settles only what the ledger still owes (no double count); idempotent', async () => {
    await rolledBack(async (tx) => {
      const t = await teacher(tx);
      const lA = await lesson(tx, { teacher: t, days: 8, minutes: 60, status: 'completed' });
      const lB = await lesson(tx, { teacher: t, days: 9, minutes: 60, status: 'completed' });
      const a = await earningOf(tx, lA);
      if (!a) throw new Error('earning missing');
      await pay(tx, { teacher_id: t, method: 'bank', paid_at: at(10), amount: 90, items: [{ earning_id: a.id, amount: 90 }] });
      const [o] = await tx<{ id: string }[]>`insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at, paid_at, breakdown)
        values (${t}, '2026-09-01', 2, 180, 'paid', now(), now(), ${tx.json({ lesson_ids: [lA, lB] })}) returning id`;
      if (!o) throw new Error('payout missing');
      await tx`select public.settle_payout_ledger(${o.id}, null)`;
      await tx`select public.settle_payout_ledger(${o.id}, null)`;
      const [row] = await tx<{ amount: string; n: number }[]>`select sum(amount) as amount, count(*)::int as n
        from public.teacher_payments where payout_id = ${o.id}`;
      expect(row).toEqual({ amount: '90.00', n: 1 });
      const [sum] = await tx<{ outstanding: string }[]>`select coalesce(sum(outstanding), 0) as outstanding
        from public.v_teacher_earnings where teacher_id = ${t}`;
      expect(sum?.outstanding).toBe('0.00');
    });
  });

  test('RLS: a teacher reads only her own earnings, payments and items; an admin reads all; no direct writes', async () => {
    await rolledBack(async (tx) => {
      const mine = await teacher(tx, await userId(tx, USERS.teacher.email));
      const other = await teacher(tx);
      const lMine = await lesson(tx, { teacher: mine, days: 11, minutes: 60, status: 'completed' });
      const lOther = await lesson(tx, { teacher: other, days: 12, minutes: 60, status: 'completed' });
      for (const [t, l] of [[mine, lMine], [other, lOther]] as const) {
        const e = await earningOf(tx, l);
        if (!e) throw new Error('earning missing');
        await pay(tx, { teacher_id: t, method: 'bank', paid_at: at(15), amount: 90, items: [{ earning_id: e.id, amount: 90 }] });
      }
      const teacherId = await userId(tx, USERS.teacher.email);
      const read = (table: string) => as(tx, teacherId, () => tx.unsafe(`select teacher_id from public.${table}`));
      expect((await read('teacher_session_earnings')).every((r) => r.teacher_id === mine)).toBe(true);
      expect((await read('teacher_payments')).every((r) => r.teacher_id === mine)).toBe(true);
      expect(await as(tx, teacherId, () => tx`select 1 from public.teacher_payment_items`)).toHaveLength(1);
      expect((await as(tx, teacherId, () => tx`select 1 from public.v_teacher_earnings`)).length).toBe(1);
      const adminId = await userId(tx, USERS.admin.email);
      expect((await as(tx, adminId, () => tx`select 1 from public.teacher_session_earnings`)).length).toBeGreaterThanOrEqual(2);
      await tx`savepoint w`;
      await expect(as(tx, teacherId, () => tx`insert into public.teacher_payments (teacher_id, amount, paid_at, method)
        values (${mine}, 1, now(), 'cash')`)).rejects.toThrow();
      await tx`rollback to savepoint w`;
    });
  });
});
