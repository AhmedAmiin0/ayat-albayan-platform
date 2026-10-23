import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from './common/integrations/integration-overlay';
import { activeNumberId, setNumbersOverlay } from './common/integrations/numbers-overlay';
import { appSecrets, envFrom, lineEnvs, lineNumbers, loadEnv } from './env';
import { envCandidates } from './env.sources';

// docs/23 phase 3: comms_source = legacy (numbers overlay null) leaves loadEnv() exactly as before;
// module lays the numbers' line keys over everything.

const LEGACY = { WA_API_BASE: 'http://localhost:4010', WA_PHONE_NUMBER_ID: 'env-p', WA_WABA_ID: 'env-w', WA_ACCESS_TOKEN: 'env-token-fake' };

afterEach(() => {
  setIntegrationOverlay({});
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('legacy: loadEnv() is unchanged', () => {
  it('no numbers overlay → the same candidates as before (none, or env + the integration overlay)', () => {
    expect(envCandidates({ A: '1' }, null)).toEqual([]);
    setIntegrationOverlay({ WA_WABA_ID: 'db-w' });
    expect(envCandidates({ A: '1' }, null)).toEqual([{ A: '1', WA_WABA_ID: 'db-w' }]);
  });

  it('the line config, webhook ids and app secrets equal envFrom(null) and nothing is stamped', () => {
    for (const [k, v] of Object.entries(LEGACY)) vi.stubEnv(k, v);
    vi.stubEnv('WA_APP_SECRET', 'env-secret-fake');
    expect(loadEnv()).toEqual(envFrom(null));
    expect(lineEnvs(loadEnv()).notifications).toMatchObject({ phoneNumberId: 'env-p', accessToken: 'env-token-fake' });
    expect(appSecrets(loadEnv())).toEqual(['env-secret-fake']);
    expect(activeNumberId('notifications')).toBeUndefined();
  });
});

describe('module: the numbers overlay replaces the per-line keys', () => {
  it('a role\'s default number wins over env and the integration overlay; global keys stay', () => {
    for (const [k, v] of Object.entries(LEGACY)) vi.stubEnv(k, v);
    setIntegrationOverlay({ WA_WABA_ID: 'db-w' });
    setNumbersOverlay({ values: { WA_PHONE_NUMBER_ID: 'num-p', WA_WABA_ID: 'num-w', WA_ACCESS_TOKEN: 'num-token-fake' }, numberIds: { notifications: 'num-1' } });
    const line = lineEnvs(loadEnv()).notifications;
    expect(line).toMatchObject({ base: 'http://localhost:4010', phoneNumberId: 'num-p', wabaId: 'num-w', accessToken: 'num-token-fake' });
    expect(activeNumberId('notifications')).toBe('num-1');
    expect(activeNumberId('chat')).toBeUndefined();
  });

  it('blank values unset a role (no default number → that line is unconfigured, the webhook drops it)', () => {
    for (const [k, v] of Object.entries(LEGACY)) vi.stubEnv(k, v);
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'env-chat');
    setNumbersOverlay({ values: { WA_CHAT_PHONE_NUMBER_ID: '' }, numberIds: {} });
    expect(lineNumbers(loadEnv())).toEqual({ notifications: 'env-p' });
  });

  it('envFrom(null) still answers the legacy side while module is active (parity)', () => {
    for (const [k, v] of Object.entries(LEGACY)) vi.stubEnv(k, v);
    setNumbersOverlay({ values: { WA_PHONE_NUMBER_ID: 'num-p' }, numberIds: {} });
    expect(envFrom(null).WA_PHONE_NUMBER_ID).toBe('env-p');
    expect(loadEnv().WA_PHONE_NUMBER_ID).toBe('num-p');
  });
});
