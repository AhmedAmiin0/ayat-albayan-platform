import { expect, test } from '@playwright/test';
import { assistant, brought, code, commissionOf, one, pay } from '../support/assistant';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Assistant statements, reversals and visibility (migrations 271-274) against the real database:
// salary + commissions + adjustments per currency, draft -> approved -> paid like teacher payouts,
// a void after the statement was paid becomes an adjustment, and RLS keeps each salesperson to
// their own rows. Each case is rolled back.

const TERMS = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01',
  salary_amount: 1000, salary_currency: 'EGP', salary_starts_on: '2000-01-01' } as const;
const thisMonth = async (tx: Tx) =>
  (await tx<{ m: string }[]>`select public.assistant_next_open_month(null)::text as m`)[0]?.m ?? '';
const generate = async (tx: Tx, a: string, month: string) => one(
  (await tx<{ r: { statement_id: string; totals: Record<string, Record<string, number>> } }[]>`select
    public.generate_assistant_statement(${a}, ${month}, null) as r`)).r;
const statusOf = async (tx: Tx, id: string) =>
  (await tx<{ status: string }[]>`select status from public.assistant_statements where id = ${id}`)[0]?.status;

test.describe('assistant statements and scope (20261006000271-274)', () => {
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

  test('draft -> approved -> paid, back with unpay and reopen; a frozen statement is not regenerated', async () => {
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
    });
  });

  test('a void inside a draft just drops out; after the statement was paid it becomes a negative adjustment next time', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'void', { ...TERMS, salary_amount: null, salary_currency: null, salary_starts_on: null });
      const month = await thisMonth(tx);
      const d = await brought(tx, { by: a, phone: '+966500000202', price: 200 });
      await pay(tx, d.sub, 200);
      const draft = await generate(tx, a, month);
      expect(draft.totals).toEqual({ SAR: { salary: 0, commissions: 20, adjustments: 0, total: 20 } });
      await pay(tx, d.sub, { amount: 200, kind: 'refund' });
      const rebuilt = one(await tx<{ totals: unknown }[]>`select totals from public.assistant_statements where id = ${draft.statement_id}`);
      expect(rebuilt.totals).toEqual({});
      expect((await tx`select 1 from public.assistant_adjustments where assistant_id = ${a}`).length).toBe(0);

      const p = await brought(tx, { by: a, phone: '+966500000203', price: 500 });
      await pay(tx, p.sub, 500);
      await generate(tx, a, month);
      await tx`select public.approve_assistant_statement(${draft.statement_id}, null)`;
      await tx`select public.pay_assistant_statement(${draft.statement_id}, null, '{}')`;
      await pay(tx, p.sub, { amount: 100, kind: 'refund' });
      expect(await commissionOf(tx, p.student)).toMatchObject({ status: 'voided' });
      expect(await statusOf(tx, draft.statement_id)).toBe('paid');
      const adj = one(await tx<{ amount: string; effective_month: string; statement_id: string | null }[]>`select amount::text,
        effective_month::text, statement_id from public.assistant_adjustments where assistant_id = ${a}`);
      expect(adj).toMatchObject({ amount: '-50.00', statement_id: null });
      expect(adj.effective_month > month).toBe(true);
      const nextMonth = adj.effective_month;
      const next = await generate(tx, a, nextMonth);
      expect(next.totals).toEqual({ SAR: { salary: 0, commissions: 0, adjustments: -50, total: -50 } });
      expect(await code(tx, () => tx`select public.reopen_assistant_statement(${draft.statement_id}, null)`)).toBe('invalid_transition');
      await tx`select public.unpay_assistant_statement(${draft.statement_id}, null, 'check')`;
      expect(await code(tx, () => tx`select public.reopen_assistant_statement(${draft.statement_id}, null)`)).toBe('reversal_in_later_statement');
    });
  });

  test('a salesperson reads only their own terms, commissions, statements, brought students and recorded payments', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'rls-a', TERMS);
      const b = await assistant(tx, 'rls-b', TERMS);
      const admin = await userId(tx, USERS.admin.email);
      const mine = await brought(tx, { by: a, phone: '+966500000204', price: 100 });
      const theirs = await brought(tx, { by: b, phone: '+966500000205', price: 100 });
      await pay(tx, mine.sub, { amount: 100, by: a });
      await pay(tx, theirs.sub, { amount: 100, by: b });
      await generate(tx, a, await thisMonth(tx));
      await generate(tx, b, await thisMonth(tx));
      const count = async (who: string, table: string) =>
        (await as(tx, who, () => tx.unsafe(`select count(*)::int n from public.${table}`)))[0]?.n;
      for (const t of ['assistant_terms', 'assistant_commissions', 'assistant_statements']) {
        expect(await count(a, t)).toBe(1);
        expect(await count(admin, t)).toBe(2);
      }
      expect(await count(a, 'assistant_statement_lines')).toBe(2);
      expect(await count(a, 'students')).toBe(1);
      expect(await count(a, 'payments')).toBe(1);
      expect(await count(admin, 'payments')).toBe(2);
      expect(await count(a, 'subscriptions')).toBe(0);
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('inbound', '+966500000204', 'مرحبا'), ('inbound', '+966500000205', 'مرحبا')`;
      expect(await count(a, 'messages')).toBe(1); // the chat of the family they brought, not the other's
      expect(await count(a, 'guardians')).toBe(1);
      const rows = await as(tx, a, () => tx`select student_id, first_subscription_paid, commission_amount::text as amount
        from public.v_assistant_students`);
      expect(rows).toEqual([{ student_id: mine.student, first_subscription_paid: true, amount: '10.00' }]);
      expect(await code(tx, () => as(tx, a, () => tx`update public.assistant_terms set salary_amount = 9999`))).toBe('42501');
      expect(await code(tx, () => as(tx, a, () => tx`delete from public.assistant_commissions`))).toBe('42501');
      await tx`set local role anon`;
      expect(await code(tx, () => tx`select 1 from public.assistant_commissions`)).toBe('42501');
      await tx`reset role`;
    });
  });
});
