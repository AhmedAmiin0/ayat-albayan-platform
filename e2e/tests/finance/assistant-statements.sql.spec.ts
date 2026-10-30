import { expect, test } from '@playwright/test';
import { assistant, brought, code, commissionOf, generate, iso, lastMonth, one, paidStatement, pay } from '../../support/sales/assistant';
import { rolledBack, type Tx } from '../../support/core/rls';

// Assistant statements and reversals (migrations 271-274) against the real database: salary + commissions
// + adjustments per currency, draft -> approved -> paid like teacher payouts, a void after the statement
// was paid becomes an adjustment. Who may read what is assistant-scope.sql.spec.ts. Each case is rolled back.

const TERMS = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01',
  salary_amount: 1000, salary_currency: 'EGP', salary_starts_on: '2000-01-01' } as const;
const NO_SALARY = { ...TERMS, salary_amount: null, salary_currency: null, salary_starts_on: null };
const thisMonth = async (tx: Tx) =>
  (await tx<{ m: string }[]>`select public.assistant_next_open_month(null)::text as m`)[0]?.m ?? '';
const nextMonth = async (tx: Tx) =>
  one(await tx<{ m: string }[]>`select (date_trunc('month', now() at time zone 'Asia/Riyadh') + interval '1 month')::date::text as m`).m;
const statusOf = async (tx: Tx, id: string) =>
  (await tx<{ status: string }[]>`select status from public.assistant_statements where id = ${id}`)[0]?.status;

test.describe('assistant statements (20261006000271-274)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('salary plus commission, per currency, never summed across them; regenerating a draft is idempotent', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'tot', TERMS);
      const month = await thisMonth(tx);
      const x = await brought(tx, { by: a, phone: '+966500000201', price: 300, currency: 'USD' });
      await pay(tx, x.sub, 300);
      const first = await generate(tx, a, month);
      expect(first.totals).toEqual({
        EGP: { salary: 1000, commissions: 0, adjustments: 0, total: 1000 },
        USD: { salary: 0, commissions: 30, adjustments: 0, total: 30 },
      });
      const again = await generate(tx, a, month);
      expect(again).toEqual(first);
      expect((await tx`select 1 from public.assistant_statement_lines where statement_id = ${first.statement_id}`).length).toBe(2);
      expect((await commissionOf(tx, x.student))?.statement_id).toBe(first.statement_id);
    });
  });

  test('draft -> approved -> paid, back with unpay and reopen; a frozen statement is not regenerated; a month that has not begun is refused', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'flow', TERMS);
      const month = await thisMonth(tx);
      const { statement_id: id } = await generate(tx, a, month);
      const run = (q: () => Promise<unknown>) => code(tx, q);
      expect(await run(() => tx`select public.pay_assistant_statement(${id}, null, '{}')`)).toBe('invalid_transition');
      await tx`select public.approve_assistant_statement(${id}, null)`;
      expect(await run(() => tx`select public.approve_assistant_statement(${id}, null)`)).toBe('invalid_transition');
      expect(await run(() => tx`select public.generate_assistant_statement(${a}, ${month}, null)`)).toBe('invalid_transition');
      await tx`select public.reopen_assistant_statement(${id}, null)`;
      expect(await statusOf(tx, id)).toBe('draft');
      await tx`select public.approve_assistant_statement(${id}, null)`;
      await tx`select public.pay_assistant_statement(${id}, null, '{"method":"bank","note":"n"}')`;
      expect(await statusOf(tx, id)).toBe('paid');
      await tx`select public.unpay_assistant_statement(${id}, null, 'wrong account')`;
      expect(await statusOf(tx, id)).toBe('approved');
      expect(await run(() => tx`select public.generate_assistant_statement(${a}, '2026-02-15', null)`)).toBe('invalid_month');
      const future = await nextMonth(tx);
      expect(await run(() => tx`select public.generate_assistant_statement(${a}, ${future}, null)`)).toBe('invalid_month');
    });
  });

  test('approve recalculates a stale draft first: a commission earned after the draft was built is in what is frozen', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stale', NO_SALARY);
      const x = await brought(tx, { by: a, phone: '+966500000207', price: 100 });
      await pay(tx, x.sub, 100);
      const { statement_id: id, totals } = await generate(tx, a, await thisMonth(tx));
      expect(totals).toEqual({ SAR: { salary: 0, commissions: 10, adjustments: 0, total: 10 } });
      const y = await brought(tx, { by: a, phone: '+966500000208', price: 200 });
      await pay(tx, y.sub, 200); // the draft does not know yet
      await tx`select public.approve_assistant_statement(${id}, null)`;
      const frozen = one(await tx<{ totals: unknown }[]>`select totals from public.assistant_statements where id = ${id}`);
      expect(frozen.totals).toEqual({ SAR: { salary: 0, commissions: 30, adjustments: 0, total: 30 } });
      expect((await tx`select 1 from public.assistant_statement_lines where statement_id = ${id}`).length).toBe(2);
    });
  });

  test('a void inside a draft just drops out; after the statement was paid it becomes a negative adjustment for the next open month', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'void', NO_SALARY);
      const month = await thisMonth(tx);
      const d = await brought(tx, { by: a, phone: '+966500000202', price: 200 });
      await pay(tx, d.sub, 200);
      const draft = await generate(tx, a, month);
      expect(draft.totals).toEqual({ SAR: { salary: 0, commissions: 20, adjustments: 0, total: 20 } });
      await pay(tx, d.sub, { amount: 200, kind: 'refund' });
      const rebuilt = one(await tx<{ totals: unknown }[]>`select totals from public.assistant_statements where id = ${draft.statement_id}`);
      expect(rebuilt.totals).toEqual({});
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a}`).length).toBe(0);

      // A statement of LAST month (a month that has not begun cannot be built): a package paid 35 days ago.
      const p = await brought(tx, { by: a, phone: '+966500000203', price: 500, broughtAt: iso(-40) });
      await pay(tx, p.sub, { amount: 500, at: iso(-35) });
      const paid = await paidStatement(tx, a, await lastMonth(tx));
      await pay(tx, p.sub, { amount: 100, kind: 'refund' });
      expect(await commissionOf(tx, p.student)).toMatchObject({ status: 'voided' });
      expect(await statusOf(tx, paid)).toBe('paid');
      const adj = one(await tx<{ amount: string; effective_month: string; statement_id: string | null }[]>`select amount::text,
        effective_month::text, statement_id from public.assistant_adjustments where assistant_id = ${a}`);
      expect(adj).toEqual({ amount: '-50.00', effective_month: month, statement_id: null });
      const next = await generate(tx, a, month);
      expect(next.totals).toEqual({ SAR: { salary: 0, commissions: 0, adjustments: -50, total: -50 } });
      expect(await code(tx, () => tx`select public.reopen_assistant_statement(${paid}, null)`)).toBe('invalid_transition');
      await tx`select public.unpay_assistant_statement(${paid}, null, 'check')`;
      expect(await code(tx, () => tx`select public.reopen_assistant_statement(${paid}, null)`)).toBe('reversal_in_later_statement');
    });
  });
});
