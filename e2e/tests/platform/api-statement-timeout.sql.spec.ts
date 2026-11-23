import { expect, test } from '@playwright/test';
import { withSql } from '../../support/core/schedule';
import { rolledBack, type Tx } from '../../support/core/rls';

// The server cap on the API's statements (migration 20261123000300): a call still running after
// the API's 15 s deadline is cancelled by Postgres, so a write cannot commit after the 503.

const CAP_MS = 20_000;
const ROLES = ['authenticator', 'service_role', 'postgres'];

const roleCap = async (tx: Tx): Promise<string | undefined> => {
  const [row] = await tx<{ value: string }[]>`
    select substr(c, length('statement_timeout=') + 1) as value
      from pg_roles r, unnest(r.rolconfig) c
     where r.rolname = 'service_role' and c like 'statement_timeout=%'`;
  return row?.value;
};

const capMs = async (tx: Tx, value: string): Promise<number> => {
  await tx`select set_config('statement_timeout', ${value}, true)`;
  const [row] = await tx<{ ms: number }[]>`
    select setting::int as ms from pg_settings where name = 'statement_timeout'`;
  await tx`select set_config('statement_timeout', '0', true)`;
  return row?.ms ?? 0;
};

test.describe('API statement timeout (SQL)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the role settings, printed for the PR', async () => {
    await withSql(async (sql) => {
      const roles = await sql`
        select rolname, rolconfig from pg_roles where rolname in ${sql(ROLES)} order by rolname`;
      const [server] = await sql`
        select boot_val, reset_val from pg_settings where name = 'statement_timeout'`;
      const perDb = await sql`
        select setrole::regrole::text as role, setconfig from pg_db_role_setting
         where setdatabase = (select oid from pg_database where datname = current_database())`;
      console.log('statement_timeout roles', JSON.stringify({ roles, server, perDb }));
      expect(roles.length).toBe(ROLES.length);
    });
  });

  test('service_role is capped at 20 s or less', async () => {
    await rolledBack(async (tx) => {
      const value = await roleCap(tx);
      expect(value).toBeDefined();
      const ms = await capMs(tx, value ?? '0');
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(CAP_MS);
    });
  });

  test('a call that sleeps past the cap is cancelled (57014)', async () => {
    test.setTimeout(60_000);
    await rolledBack(async (tx) => {
      const value = (await roleCap(tx)) ?? '0';
      const ms = await capMs(tx, value);
      await tx`set local role service_role`;
      // What PostgREST does with the role's settings on each request.
      await tx`select set_config('statement_timeout', ${value}, true)`;
      const sleep = tx`select pg_sleep(${(ms + 1_000) / 1_000})`;
      await expect(sleep).rejects.toMatchObject({ code: '57014' });
    });
  });
});
