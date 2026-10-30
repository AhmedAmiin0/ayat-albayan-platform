import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { IntegrationConfigQueries } from './integration-config.queries';

const T = 'integration_config';

describe('IntegrationConfigQueries: the table and the Vault functions', () => {
  it('rawValues: plain keys from the table, secret keys from integration_secrets_read, nothing else', async () => {
    const { db } = fakeDb({
      [T]: [{ data: [{ key: 'WA_WABA_ID', value: 'w' }, { key: 'WA_ACCESS_TOKEN', value: 'not-from-the-table' }] }],
      'rpc:integration_secrets_read': [{ data: [{ key: 'WA_ACCESS_TOKEN', value: 'vault-fake' }, { key: 'WA_WABA_ID', value: 'x' }] }],
    });
    expect(await new IntegrationConfigQueries(db).rawValues()).toEqual({ WA_WABA_ID: 'w', WA_ACCESS_TOKEN: 'vault-fake' });
  });

  it('a failed read throws with the database message (the service turns it into a warning)', async () => {
    const { db } = fakeDb({ [T]: [{ data: [] }], 'rpc:integration_secrets_read': [{ error: { message: 'does not exist' } }] });
    await expect(new IntegrationConfigQueries(db).rawValues()).rejects.toThrow('does not exist');
  });

  it('writePlain upserts a value with the admin and deletes a null', async () => {
    const { db, calls } = fakeDb({ [T]: [{}, {}] });
    await new IntegrationConfigQueries(db).writePlain({ WA_WABA_ID: 'w', FX_API_URL: null }, 'admin-id');
    expect(calls.filter((c) => c.table === T).map((c) => [c.method, c.args])).toEqual([
      ['upsert', [{ key: 'WA_WABA_ID', value: 'w', updated_by: 'admin-id' }]],
      ['delete', []],
      ['eq', ['key', 'FX_API_URL']],
    ]);
  });

  it('secrets go through integration_secret_set / _clear / _status, by key', async () => {
    const { db, calls } = fakeDb({
      'rpc:integration_secret_set': [{}],
      'rpc:integration_secret_clear': [{ data: false }],
      'rpc:integration_secrets_status': [{ data: [{ key: 'WA_APP_SECRET', updated_at: '2026-10-12T00:00:00Z' }] }],
    });
    const q = new IntegrationConfigQueries(db);
    await q.setSecret({ key: 'WA_APP_SECRET', value: 'fake' });
    expect(await q.clearSecret('LIVEKIT_API_KEY')).toBe(false);
    expect(await q.secretStatus()).toEqual([{ key: 'WA_APP_SECRET', updated_at: '2026-10-12T00:00:00Z' }]);
    expect(calls.map((c) => [c.table, c.args])).toEqual([
      ['rpc:integration_secret_set', [{ p_key: 'WA_APP_SECRET', p_value: 'fake' }]],
      ['rpc:integration_secret_clear', [{ p_key: 'LIVEKIT_API_KEY' }]],
      ['rpc:integration_secrets_status', [undefined]],
    ]);
  });
});
