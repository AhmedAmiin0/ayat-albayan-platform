import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../env';
import { LEGACY_ENV } from './numbers.fakes';
import { differences, parityRoles } from './numbers.parity';

const env = (over: Record<string, string> = {}) => loadEnv({ ...LEGACY_ENV, ...over });

describe('parity: the legacy and module paths field by field', () => {
  it('identical config → no difference (the switch may flip)', () => {
    const roles = parityRoles({ legacy: env(), module: env(), numbers: { notifications: { id: 'num-1', label: 'رقم' } } });
    expect(differences(roles)).toEqual([]);
    expect(roles[0]).toMatchObject({ role: 'notifications', number_id: 'num-1', number_label: 'رقم' });
  });

  it('a different id or token is listed; secrets show only set / null, never the value', () => {
    const roles = parityRoles({ legacy: env(), module: env({ WA_WABA_ID: '2000000009', WA_ACCESS_TOKEN: 'other-fake' }), numbers: {} });
    expect(differences(roles)).toEqual([
      { role: 'notifications', field: 'waba_id', state: 'different' },
      { role: 'notifications', field: 'access_token', state: 'different' },
    ]);
    const token = roles[0]?.fields.find((f) => f.field === 'access_token');
    expect(token).toEqual({ field: 'access_token', state: 'different', legacy: 'set', module: 'set' });
    expect(JSON.stringify(roles)).not.toMatch(/token-fake|other-fake|secret-fake/);
  });

  it('a role missing on the module side is «missing», and unconfigured on both is the same', () => {
    const module = loadEnv({ SUPABASE_URL: LEGACY_ENV.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'k', WA_API_BASE: LEGACY_ENV.WA_API_BASE });
    const diff = differences(parityRoles({ legacy: env(), module, numbers: {} }));
    expect(diff).toContainEqual({ role: 'notifications', field: 'phone_number_id', state: 'missing' });
    expect(diff).toContainEqual({ role: 'notifications', field: 'configured', state: 'different' });
    expect(diff.filter((d) => d.role === 'chat')).toEqual([]);
  });

  it('a chat app secret without any chat number on either side is not compared', () => {
    const roles = parityRoles({ legacy: env({ WA_CHAT_APP_SECRET: 'chat-secret-fake' }), module: env(), numbers: {} });
    expect(differences(roles)).toEqual([]);
  });
});
