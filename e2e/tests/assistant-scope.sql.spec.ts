import { expect, test } from '@playwright/test';
import { assistant, brought, code, generate, pay } from '../support/assistant';
import { as, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// The second wall (RLS, migrations 271 and 274) against the real database: a salesperson who reads
// PostgREST directly gets her own rows only, never a draft statement, never the subscription price,
// never a student's row (notes, links, teacher); a guardian, a teacher or nobody gets none of it.
// The API serves the portal with the service role; this is what a stolen login could reach. Rolled back.

const TERMS = { commission_type: 'percent', commission_value: 10, commission_starts_on: '2000-01-01',
  salary_amount: 1000, salary_currency: 'EGP', salary_starts_on: '2000-01-01' } as const;
const month = async (tx: Tx) => (await tx<{ m: string }[]>`select public.assistant_next_open_month(null)::text as m`)[0]?.m ?? '';

test.describe('assistant scope: what a salesperson can read directly (20261006000271, 274)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('her own terms, commissions, approved statements, brought students and recorded payments; nothing else', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const count = async (who: string, table: string) =>
        (await as(tx, who, () => tx.unsafe(`select count(*)::int n from public.${table}`)))[0]?.n ?? 0;
      // Other specs share this database: the admin sees every row, so count what these two add.
      const TABLES = ['assistant_terms', 'assistant_commissions', 'assistant_statements', 'payments'];
      const before: Record<string, number> = {};
      for (const t of TABLES) before[t] = (await tx.unsafe(`select count(*)::int n from public.${t}`))[0]?.n ?? 0; // as the owner: no role is set yet
      const a = await assistant(tx, 'rls-a', TERMS);
      const b = await assistant(tx, 'rls-b', TERMS);
      const mine = await brought(tx, { by: a, phone: '+966500000204', price: 100 });
      const theirs = await brought(tx, { by: b, phone: '+966500000205', price: 100 });
      await pay(tx, mine.sub, { amount: 100, by: a });
      await pay(tx, theirs.sub, { amount: 100, by: b });
      const mineStatement = await generate(tx, a, await month(tx));
      await generate(tx, b, await month(tx));
      // A draft is the admin's: she sees no statement and no line until it is approved.
      expect([await count(a, 'assistant_statements'), await count(a, 'assistant_statement_lines')]).toEqual([0, 0]);
      await tx`select public.approve_assistant_statement(${mineStatement.statement_id}, null)`;
      for (const t of ['assistant_terms', 'assistant_commissions', 'assistant_statements']) {
        expect(await count(a, t)).toBe(1);
        expect(await count(admin, t)).toBe((before[t] ?? 0) + 2); // the admin also sees b's draft
      }
      expect(await count(a, 'assistant_statement_lines')).toBe(2);
      expect(await count(a, 'payments')).toBe(1);
      expect(await count(admin, 'payments')).toBe((before['payments'] ?? 0) + 2);
      expect(await count(a, 'subscriptions')).toBe(0);
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('inbound', '+966500000204', 'مرحبا'), ('inbound', '+966500000205', 'مرحبا')`;
      expect(await count(a, 'messages')).toBe(1); // the chat of the family they brought, not the other's
      expect(await count(a, 'guardians')).toBe(1);
      expect(await count(a, 'students')).toBe(0); // no policy on students: notes, links and the teacher stay hidden
      expect(await code(tx, () => as(tx, a, () => tx`update public.assistant_terms set salary_amount = 9999`))).toBe('42501');
      expect(await code(tx, () => as(tx, a, () => tx`delete from public.assistant_commissions`))).toBe('42501');
      await tx`set local role anon`;
      expect(await code(tx, () => tx`select 1 from public.assistant_commissions`)).toBe('42501');
      await tx`reset role`;
    });
  });

  test('the price is out of reach: her commissions show the amount and the status, not the subscription, its price or the reason', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'rls-price', TERMS);
      const mine = await brought(tx, { by: a, phone: '+966500000206', price: 100 });
      await pay(tx, mine.sub, 100);
      const read = (columns: string) => code(tx, () => as(tx, a, () => tx.unsafe(`select ${columns} from public.assistant_commissions`)));
      expect(await read('amount, currency, status, earned_at, statement_id')).toBe('ok');
      for (const hidden of ['base_amount', 'base_currency', 'subscription_id', 'void_reason', '*']) expect([hidden, await read(hidden)]).toEqual([hidden, '42501']);
    });
  });

  test('v_assistant_students: her brought students only, whitelisted columns; the admin all of them; a teacher and nobody none', async () => {
    await rolledBack(async (tx) => {
      const [admin, teacher] = [await userId(tx, USERS.admin.email), await userId(tx, USERS.teacher.email)];
      const a = await assistant(tx, 'view-a', TERMS);
      const b = await assistant(tx, 'view-b', TERMS);
      const mine = await brought(tx, { by: a, phone: '+966500000209', price: 100 });
      const theirs = await brought(tx, { by: b, phone: '+966500000210', price: 100 });
      await pay(tx, mine.sub, 100);
      const ids = (who: string) => as(tx, who, () => tx<{ student_id: string }[]>`select student_id from public.v_assistant_students
        where student_id in (${mine.student}, ${theirs.student}) order by student_id`).then((rows) => rows.map((r) => r.student_id));
      expect(await ids(a)).toEqual([mine.student]);
      expect(await ids(b)).toEqual([theirs.student]);
      expect(await ids(admin)).toEqual([mine.student, theirs.student].sort());
      expect(await ids(teacher)).toEqual([]);
      const row = (await as(tx, a, () => tx`select * from public.v_assistant_students where student_id = ${mine.student}`))[0];
      expect(Object.keys(row ?? {}).sort()).toEqual([
        'assistant_id', 'brought_at', 'code', 'commission_amount', 'commission_currency', 'commission_earned_at', 'commission_id',
        'commission_status', 'first_paid_at', 'first_subscription_paid', 'name', 'renewal_commission_count', 'student_id',
      ]);
      expect(row).toMatchObject({ first_subscription_paid: true, commission_amount: '10.00' });
      await tx`set local role anon`;
      expect(await code(tx, () => tx`select 1 from public.v_assistant_students`)).toBe('42501');
      await tx`reset role`;
    });
  });
});
