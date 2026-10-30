import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, tokenOf } from '../../support/sales/assistant-api';
import { runConfigSeed } from '../../support/platform/config-seed';
import { withSql } from '../../support/core/schedule';
import { restoreSettings, snapshotSettings } from '../../support/platform/settings';
import { USERS } from '../../support/core/users';

// 26-P2 «Copy» + «Parity» (docs/26 §4) through the REAL API: GET /admin/config/parity is empty on the
// e2e database (CI runs this), and a missing row, a JSON null and a seeded null give the same
// GET /settings, the same GET /settings/public and a closed send gate, with no `messages` row created.
// The send-gate rows are only deleted or set to JSON null (both = OFF), then put back.

const KEYS = [
  'late_cancel_hours', 'recording_retention_days', 'recording_consent_notice', 'booking_horizon_weeks',
  'academy_contact', 'messaging_enabled', 'auto_messages_enabled', 'comms_source',
];
type Json = Record<string, unknown>;

async function get(request: APIRequestContext, input: { token: string; path: string }): Promise<Json> {
  const res = await request.get(`${API}${input.path}`, {
    headers: { authorization: `Bearer ${input.token}`, 'x-ab-client': 'e2e/1' },
  });
  expect(res.status(), input.path).toBe(200);
  return (await res.json()) as Json;
}

const messageCount = () => withSql(async (sql) => (await sql<{ n: number }[]>`select count(*)::int as n from public.messages`)[0]?.n);

async function putState(state: 'missing' | 'null' | 'seeded'): Promise<void> {
  await withSql(async (sql) => {
    await sql`delete from public.settings where key = any(${KEYS})`;
    if (state === 'null') for (const key of KEYS) await sql`insert into public.settings (key, value) values (${key}, 'null')`;
    if (state === 'seeded') {
      await sql`update public.settings_revision set registry_version = 0`;
      await runConfigSeed(sql);
    }
  });
}

test.describe.serial('config parity and null semantics (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let admin = '';
  let rows: { key: string; value: unknown }[] = [];

  test.beforeAll(async () => {
    rows = await snapshotSettings(KEYS);
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
  });
  test.afterAll(() => restoreSettings({ keys: KEYS, rows }));

  test('GET /admin/config/parity is empty on the e2e database', async ({ request }) => {
    const res = await get(request, { token: admin, path: '/admin/config/parity' });
    expect(res['diffs']).toEqual([]);
    expect(res['checkedKeys']).toBeGreaterThan(30);
  });

  test('a missing row, JSON null and a seeded null read the same; the gate stays closed', async ({ request }) => {
    const before = await messageCount();
    const seen: Json[] = [];
    for (const state of ['missing', 'null', 'seeded'] as const) {
      await putState(state);
      const settings = await get(request, { token: admin, path: '/settings' });
      const pub = await get(request, { token: admin, path: '/settings/public' });
      const gate = await get(request, { token: admin, path: '/messages/gate' });
      const parity = await get(request, { token: admin, path: '/admin/config/parity' });
      expect(parity['diffs'], state).toEqual([]);
      expect(gate['open'], state).toBe(false);
      expect(settings['messaging_enabled'], state).toBe(false);
      expect(settings['auto_messages_enabled'], state).toBe(false);
      expect(settings['late_cancel_hours'], state).toBeNull();
      seen.push({ settings, pub });
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    expect(await messageCount()).toBe(before);
  });
});
