import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { NumbersSecrets } from './numbers.secrets';

const ID = '00000000-0000-4000-8000-0000000000a1';

describe('NumbersSecrets (Vault RPCs)', () => {
  it('set / clear / copy call the per-number RPCs by id and name', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:wa_number_secret_clear': [{ data: true }], 'rpc:wa_number_secret_copy': [{ data: false }] });
    const s = new NumbersSecrets(db);
    await s.set({ id: ID, name: 'access_token' }, 'token-fake');
    expect(argsOf('rpc:wa_number_secret_set', 'rpc')?.[0]).toEqual({ p_id: ID, p_name: 'access_token', p_value: 'token-fake' });
    await expect(s.clear({ id: ID, name: 'app_secret' })).resolves.toBe(true);
    await expect(s.copy({ id: ID, name: 'access_token' }, 'WA_ACCESS_TOKEN')).resolves.toBe(false);
    expect(argsOf('rpc:wa_number_secret_copy', 'rpc')?.[0]).toEqual({ p_id: ID, p_name: 'access_token', p_key: 'WA_ACCESS_TOKEN' });
  });

  it('an error never carries the value', async () => {
    const { db } = fakeDb({ 'rpc:wa_number_secret_set': [{ error: { code: '22023', message: 'invalid number secret value token-fake' } }] });
    const err = await new NumbersSecrets(db).set({ id: ID, name: 'access_token' }, 'token-fake').catch((e: Error) => e);
    expect(String(err)).toContain('22023');
    expect(String(err)).not.toContain('token-fake');
  });

  it('status groups by number (no values); read keeps only the two names', async () => {
    const { db } = fakeDb({
      'rpc:wa_number_secret_status': [{ data: [{ number_id: ID, name: 'access_token', updated_at: 't1' }, { number_id: ID, name: 'other', updated_at: 't2' }] }],
      'rpc:wa_number_secret_read': [{ data: [{ name: 'app_secret', value: 'secret-fake' }, { name: 'x', value: 'y' }] }],
    });
    const s = new NumbersSecrets(db);
    expect((await s.status()).get(ID)).toEqual({ access_token: 't1' });
    await expect(s.read(ID)).resolves.toEqual({ app_secret: 'secret-fake' });
  });
});
