import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, tokenOf } from '../support/sales/assistant-api';
import { restoreSettings, settingText, snapshotSettings } from '../support/settings';
import { USERS } from '../support/users';

// docs/26 §2f / §5 (26-P0), through the REAL API and database: the send-gate switches have their own
// routes (ON needs the exact confirmation text, OFF is always accepted) and PATCH /settings no longer
// writes the owned keys (they come back in `moved`). This file NEVER turns sending ON.

const KEYS = [
  'messaging_enabled',
  'auto_messages_enabled',
  'crm_cutover_done',
  'comms_source',
  'google_sync_enabled',
  'booking_horizon_weeks',
];
type Json = Record<string, unknown>;

async function send(request: APIRequestContext, input: { token: string; method: 'PUT' | 'PATCH'; path: string; body: object }) {
  const res = await request.fetch(`${API}${input.path}`, {
    method: input.method,
    headers: { authorization: `Bearer ${input.token}`, 'x-ab-client': 'e2e/1' },
    data: input.body,
  });
  return { status: res.status(), body: (await res.json()) as Json };
}

test.describe.serial('send-gate routes and the per-key PATCH /settings (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let admin = '';
  let rows: { key: string; value: unknown }[] = [];

  test.beforeAll(async () => {
    rows = await snapshotSettings(KEYS);
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
  });
  test.afterAll(() => restoreSettings({ keys: KEYS, rows }));

  test('PUT /messages/gate/sending {on:false} → 200 and messaging_enabled is false', async ({ request }) => {
    const res = await send(request, { token: admin, method: 'PUT', path: '/messages/gate/sending', body: { on: false } });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body['messaging_enabled']).toBe(false);
    expect(await settingText('messaging_enabled')).toBe('false');
  });

  test('ON without or with the wrong confirmation text → 428, the value stays false', async ({ request }) => {
    for (const body of [{ on: true }, { on: true, confirmText: 'نعم' }]) {
      const res = await send(request, { token: admin, method: 'PUT', path: '/messages/gate/sending', body });
      expect(res.status, JSON.stringify(res.body)).toBe(428);
      expect(res.body['code']).toBe('confirmation_required');
    }
    expect(await settingText('messaging_enabled')).toBe('false');
  });

  test('PUT /messages/gate/auto {on:false} → 200 and auto_messages_enabled is false', async ({ request }) => {
    const res = await send(request, { token: admin, method: 'PUT', path: '/messages/gate/auto', body: { on: false } });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await settingText('auto_messages_enabled')).toBe('false');
  });

  test('PATCH /settings with owned keys: they are moved, not written; the valid key is saved', async ({ request }) => {
    const cutoverBefore = await settingText('crm_cutover_done');
    const sourceBefore = await settingText('comms_source');
    const googleBefore = await settingText('google_sync_enabled');
    const body = {
      messagingEnabled: true,
      autoMessagesEnabled: true,
      crmCutoverDone: true,
      commsSource: 'module',
      googleSyncEnabled: true,
      bookingHorizonWeeks: 7,
    };
    const res = await send(request, { token: admin, method: 'PATCH', path: '/settings', body });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body['saved']).toEqual(['booking_horizon_weeks']);
    expect(res.body['moved']).toEqual(
      expect.arrayContaining(['messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'comms_source', 'google_sync_enabled']),
    );
    expect(res.body['booking_horizon_weeks']).toBe(7);
    expect(res.body['messaging_enabled']).toBe(false);
    expect(await settingText('messaging_enabled')).toBe('false');
    expect(await settingText('auto_messages_enabled')).toBe('false');
    expect(await settingText('crm_cutover_done')).toBe(cutoverBefore);
    expect(await settingText('comms_source')).toBe(sourceBefore);
    expect(await settingText('google_sync_enabled')).toBe(googleBefore);
    expect(await settingText('booking_horizon_weeks')).toBe('7');
  });
});
