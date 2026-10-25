import { describe, expect, it } from 'vitest';
import { appSecrets, bootGaps, duplicatePhone, lineEnvs, lineGaps, lineNumbers, lineProvider, loadEnv, sendingAllowed } from '../env';
import { crmGaps, crmWebhookSecret } from './env.crm';

// docs/19 «crm driver»: a line on the academy CRM's REST API — its base and key only, no ids of ours.

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = { WA_API_BASE: 'http://localhost:4010', WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba', WA_ACCESS_TOKEN: 'meta-token', WA_APP_SECRET: 'app-secret' };
const CRM = { WACRM_API_BASE: 'http://localhost:4010/crm/api/v1/', WACRM_API_KEY: 'fake-crm-key' };
const env = (over: Record<string, string> = {}) => loadEnv({ ...BASE, ...over });

describe('the crm driver env', () => {
  it('stays off unless chosen: meta is the default with the CRM keys set', () => {
    const e = env({ ...WA, ...CRM });
    expect(lineProvider(e, 'notifications')).toBe('meta');
    expect(lineEnvs(e).notifications).not.toHaveProperty('provider');
  });

  it('a crm line: the base (slash trimmed) and the key, nothing else; no Meta token or WA_API_BASE needed', () => {
    const e = env({ ...CRM, WA_PROVIDER: 'crm' });
    expect(lineEnvs(e).notifications).toEqual({ provider: 'crm', base: 'http://localhost:4010/crm/api/v1', apiKey: 'fake-crm-key' });
    expect(lineGaps(e, 'notifications')).toEqual([]);
    expect(sendingAllowed(e, true)).toBe(true);
  });

  it('names what a crm line lacks, by key name only; half-configured = not configured', () => {
    const noKey = env({ WACRM_API_BASE: CRM.WACRM_API_BASE, WA_PROVIDER: 'crm' });
    expect(lineEnvs(noKey).notifications).toBeNull();
    expect(lineGaps(noKey, 'notifications')).toEqual(['WACRM_API_KEY']);
    expect(bootGaps(noKey, 'notifications')).toEqual(['WACRM_API_KEY']);
    expect(crmGaps(env())).toEqual(['WACRM_API_BASE', 'WACRM_API_KEY']);
    expect(sendingAllowed(noKey, true)).toBe(false);
  });

  it('either line may be on crm; both on crm = one CRM number twice: the chat line stays off, flagged', () => {
    const chat = env({ ...WA, ...CRM, WA_CHAT_PROVIDER: 'crm' });
    expect(lineEnvs(chat).chat).toMatchObject({ provider: 'crm' });
    expect(duplicatePhone(chat, 'chat')).toBe(false);
    const both = env({ ...CRM, WA_PROVIDER: 'crm', WA_CHAT_PROVIDER: 'crm' });
    expect(lineEnvs(both)).toEqual({ notifications: expect.objectContaining({ provider: 'crm' }), chat: null });
    expect(duplicatePhone(both, 'chat')).toBe(true);
    expect(bootGaps(both, 'chat')).toEqual(['WA_CHAT_PROVIDER (crm, same as WA_PROVIDER)']);
  });

  it('a leftover WA_CHAT_PHONE_NUMBER_ID equal to WA_PHONE_NUMBER_ID never flags a crm chat line (it sends)', () => {
    const e = env({ ...WA, ...CRM, WA_CHAT_PROVIDER: 'crm', WA_CHAT_PHONE_NUMBER_ID: WA.WA_PHONE_NUMBER_ID });
    expect(lineEnvs(e).chat).toMatchObject({ provider: 'crm' });
    expect(duplicatePhone(e, 'chat')).toBe(false);
    expect(bootGaps(e, 'chat')).toEqual([]);
  });

  it('a crm line keeps its Meta webhook id and app secret (what Meta still delivers is stored, never dropped)', () => {
    const e = env({ ...WA, ...CRM, WA_PROVIDER: 'crm' });
    expect(lineNumbers(e)).toEqual({ notifications: 'n-phone' });
    expect(appSecrets(e)).toEqual(['app-secret']);
  });

  it('WACRM_WEBHOOK_SECRET is its own key; blank = unset', () => {
    expect(crmWebhookSecret(env({ WACRM_WEBHOOK_SECRET: 'fake-hook' }))).toBe('fake-hook');
    expect(crmWebhookSecret(env({ WACRM_WEBHOOK_SECRET: '  ' }))).toBeUndefined();
    expect(() => env({ WACRM_API_BASE: 'not a url' })).toThrow();
  });
});
