import { expect, test } from '@playwright/test';
import { assistant, brought, code, commissionOf, iso, one, pay, student, subscription, today } from '../support/assistant';
import { rolledBack } from '../support/rls';

// Assistant commission (migrations 270-274) against the real database: ONE commission per brought
// student, on the first fully paid subscription, from commission_starts_on, percent or fixed, reversed
// when the payment goes away. Each case is rolled back. Twin: @ab/shared sales/commission.ts.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;

test.describe('assistant commission (20261006000270-274)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('percent of the price, once, on the first fully paid subscription; a second one earns nothing', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'pct', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000101', price: 250 });
      await pay(tx, sub, 100);
      expect(await commissionOf(tx, s)).toBeUndefined(); // part paid: nothing yet
      await pay(tx, sub, 150);
      expect(await commissionOf(tx, s)).toMatchObject({ assistant_id: a, amount: '25.00', currency: 'SAR', status: 'earned', subscription_id: sub });
      const second = await subscription(tx, s, { price: 400 });
      await pay(tx, second, 400);
      expect(await commissionOf(tx, s)).toMatchObject({ amount: '25.00', subscription_id: sub });
      expect((await tx`select 1 from public.assistant_commissions where student_id = ${s}`).length).toBe(1);
    });
  });

  test('a fixed commission is in its own currency; a percent follows the subscription currency', async () => {
    await rolledBack(async (tx) => {
      const fixed = await assistant(tx, 'fix', { commission_type: 'fixed', commission_value: 30, commission_currency: 'EGP', commission_starts_on: '2000-01-01' });
      const a = await brought(tx, { by: fixed, phone: '+966500000102', price: 100, currency: 'USD' });
      await pay(tx, a.sub, 100);
      expect(await commissionOf(tx, a.student)).toMatchObject({ amount: '30.00', currency: 'EGP' });
      const pct = await assistant(tx, 'usd', PERCENT);
      const b = await brought(tx, { by: pct, phone: '+966500000103', price: 80.5, currency: 'USD' });
      await pay(tx, b.sub, 80.5);
      expect(await commissionOf(tx, b.student)).toMatchObject({ amount: '8.05', currency: 'USD' });
    });
  });

  test('no commission before commission_starts_on, without brought_by, without terms, or for a free package', async () => {
    await rolledBack(async (tx) => {
      const late = await assistant(tx, 'late', { ...PERCENT, commission_starts_on: iso(30).slice(0, 10) });
      const a = await brought(tx, { by: late, phone: '+966500000104', price: 100 });
      await pay(tx, a.sub, 100);
      expect(await commissionOf(tx, a.student)).toBeUndefined();
      const ok = await assistant(tx, 'ok', PERCENT);
      const nobody = await student(tx, { phone: '+966500000105' });
      await pay(tx, await subscription(tx, nobody, { price: 100 }), 100);
      expect(await commissionOf(tx, nobody)).toBeUndefined();
      const bare = await assistant(tx, 'bare');
      const b = await brought(tx, { by: bare, phone: '+966500000106', price: 100 });
      await pay(tx, b.sub, 100);
      expect(await commissionOf(tx, b.student)).toBeUndefined();
      const free = await brought(tx, { by: ok, phone: '+966500000107', price: 0 });
      await pay(tx, free.sub, 1);
      expect(await commissionOf(tx, free.student)).toBeUndefined();
    });
  });

  test('the date it became fully paid counts, not the date it was keyed in', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'dated', { ...PERCENT, commission_starts_on: today() });
      const old = await brought(tx, { by: a, phone: '+966500000108', price: 100 });
      await pay(tx, old.sub, { amount: 100, at: iso(-10) });
      expect(await commissionOf(tx, old.student)).toBeUndefined(); // paid before the start date
      const now = await brought(tx, { by: a, phone: '+966500000109', price: 100 });
      await pay(tx, now.sub, 100);
      expect(await commissionOf(tx, now.student)).toMatchObject({ status: 'earned' });
    });
  });

  test('a refund or a deleted payment reverses it; paying again reinstates the same row; a manual void stays', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'rev', PERCENT);
      const { student: s, sub } = await brought(tx, { by: a, phone: '+966500000110', price: 200 });
      await pay(tx, sub, 200);
      const first = one(await tx<{ id: string }[]>`select id from public.assistant_commissions where student_id = ${s}`);
      await pay(tx, sub, { amount: 50, kind: 'refund' });
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'voided' });
      await pay(tx, sub, 50);
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'earned', amount: '20.00' });
      await tx`delete from public.payments where subscription_id = ${sub} and amount = 50 and kind = 'payment'`;
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'voided' });
      await pay(tx, sub, 50);
      const again = one(await tx<{ id: string }[]>`select id from public.assistant_commissions where student_id = ${s}`);
      expect(again.id).toBe(first.id);
      await tx`select public.void_assistant_commission(${first.id}, null, 'wrong attribution')`;
      await pay(tx, sub, 1);
      expect(await commissionOf(tx, s)).toMatchObject({ status: 'voided' });
      expect(await code(tx, () => tx`select public.void_assistant_commission(${first.id}, null, 'again')`)).toBe('already_voided');
    });
  });

  test('brought_by: a sales creator is credited, only a sales profile may be, an admin attributes and clears it', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'who', PERCENT);
      const kid = await student(tx, { phone: '+966500000111' });
      const made = one(await tx<{ brought_by: string | null; brought_at: string | null }[]>`insert into public.students
        (guardian_id, name, name_normalized, tz, created_by)
        values ((select guardian_id from public.students where id = ${kid}), 'x', 'x', 'Asia/Riyadh', ${a})
        returning brought_by, brought_at`);
      expect(made.brought_by).toBe(a);
      expect(made.brought_at).not.toBeNull();
      const admin = one(await tx<{ id: string }[]>`select id from public.profiles where role = 'admin' limit 1`);
      const run = (q: () => Promise<unknown>) => code(tx, q);
      expect(await run(() => tx`select public.set_student_brought_by(${kid}, ${admin.id}, null)`)).toBe('invalid_assistant');
      await tx`select public.set_students_brought_by(${tx.array([kid], 2951)}, ${a}, null, ${iso(-3)})`;
      expect(await tx`select assistant_id, brought_at from public.v_assistant_students where student_id = ${kid}`).toMatchObject([{ assistant_id: a }]);
      await tx`select public.set_student_brought_by(${kid}, null, null)`;
      expect((await tx`select 1 from public.v_assistant_students where student_id = ${kid}`).length).toBe(0);
    });
  });
});
