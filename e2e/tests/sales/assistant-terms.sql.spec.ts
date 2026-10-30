import { expect, test } from '@playwright/test';
import { assistant, brought, code, commissionOf, one, openMonth, paidStatement, pay, riyadhDay } from '../../support/sales/assistant';
import { rolledBack } from '../../support/rls';

// Terms start days, a student merge and a retried adjustment (migrations 20261006000272-273) against the
// real database. Each case is rolled back.

const PERCENT = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01' } as const;
const NOBODY = '00000000-0000-4000-8000-000000000000';
const KEY = '3f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';

test.describe('assistant terms, merge and adjustment retries (20261006000272-273)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a new part cannot start in the past; a saved start day can move later, never earlier', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'terms');
      const [yesterday, today, tomorrow] = [await riyadhDay(tx, -1), await riyadhDay(tx, 0), await riyadhDay(tx, 1)];
      const terms = (commission: string | null, salary: string, rate = 10): Record<string, string | number | null> => ({
        commission_type: commission ? 'percent' : null, commission_value: commission ? rate : null, commission_currency: null,
        commission_starts_on: commission, salary_amount: 100, salary_currency: 'EGP', salary_starts_on: salary,
      });
      // tx.json sends a real jsonb: a plain string parameter cast to jsonb would be stored as a JSON string, not an object.
      const set = (p: Record<string, string | number | null>, who = a) => code(tx, () => tx`select public.set_assistant_terms(${who}, ${tx.json(p)}, null)`);
      expect(await set(terms(yesterday, today))).toBe('commission_start_in_past');
      expect(await set(terms(today, yesterday))).toBe('salary_start_in_past');
      expect(await set(terms(today, today))).toBe('ok'); // today is the first day a new part may start
      expect(await set(terms(tomorrow, tomorrow))).toBe('ok'); // moving later is the admin's right
      expect(await set(terms(today, tomorrow))).toBe('commission_start_earlier');
      expect(await set(terms(tomorrow, today))).toBe('salary_start_earlier');
      expect(await set(terms(tomorrow, tomorrow, 15))).toBe('ok'); // the same days, another rate
      const saved = one(await tx<{ commission_value: string; commission_starts_on: string }[]>`select commission_value::text,
        commission_starts_on::text from public.assistant_terms where assistant_id = ${a}`);
      expect(saved).toEqual({ commission_value: '15.00', commission_starts_on: tomorrow });
      expect(await set(terms(null, tomorrow))).toBe('ok'); // the commission is cleared ...
      expect(await set(terms(yesterday, tomorrow))).toBe('commission_start_in_past'); // ... so a new one cannot start in the past
      expect(await set(terms(today, today), NOBODY)).toBe('assistant_not_found');
    });
  });

  test('merging two students that each earned a commission keeps the kept one; the merged one is reversed and dropped', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'merge', PERCENT);
      const kept = await brought(tx, { by: a, phone: '+966500000321', price: 100 });
      const merged = await brought(tx, { by: a, phone: '+966500000322', price: 300 });
      await pay(tx, kept.sub, 100);
      await pay(tx, merged.sub, 300);
      await paidStatement(tx, a, await openMonth(tx, a)); // both commissions are in a paid statement
      await tx`select public.merge_students(${kept.student}, ${merged.student}, null)`;
      expect(await commissionOf(tx, kept.student)).toMatchObject({ assistant_id: a, status: 'earned', amount: '10.00' });
      expect((await tx`select 1 from public.assistant_commissions where assistant_id = ${a}`).length).toBe(1);
      const reversal = one(await tx<{ amount: string; reason: string; statement_id: string | null }[]>`select amount::text, reason, statement_id
        from public.assistant_adjustments where assistant_id = ${a}`);
      expect(reversal).toEqual({ amount: '-30.00', reason: 'student_merged', statement_id: null });
    });
  });

  test('a retried adjustment with the same request key lands on the first row; another key, another assistant or none adds one', async () => {
    await rolledBack(async (tx) => {
      const [a, b] = [await assistant(tx, 'adj-a'), await assistant(tx, 'adj-b')];
      const add = async (who: string, key: string | null) =>
        one(await tx<{ id: string }[]>`select public.add_assistant_adjustment(${who}, -5, 'SAR', 'خصم', null, ${key}) as id`).id;
      const first = await add(a, KEY);
      expect(await add(a, KEY)).toBe(first);
      expect(await add(b, KEY)).not.toBe(first); // the key is unique per assistant
      expect(await add(a, null)).not.toBe(await add(a, null)); // no key, no protection
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a} and kind = 'manual'`).length).toBe(3);
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a} and client_request_id = ${KEY}`).length).toBe(1);
    });
  });
});
