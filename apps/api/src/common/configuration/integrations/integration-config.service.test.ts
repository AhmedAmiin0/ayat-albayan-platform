import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationOverlay, setIntegrationOverlay } from './integration-overlay';
import { loadEnv } from '@/config/env/env';
import { asQueries, fakeQueries, type FakeQueries } from './integration-config.fakes';
import { IntegrationConfigService } from './integration-config.service';

const service = (q: FakeQueries, everyMs: number | null = 30_000) => new IntegrationConfigService(asQueries(q), everyMs);
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  setIntegrationOverlay({});
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('IntegrationConfigService: the overlay snapshot', () => {
  it('boot load puts the DB values in the overlay before anything reads the config', async () => {
    vi.stubEnv('WA_WABA_ID', 'env-waba');
    const s = service(fakeQueries({ raw: { WA_WABA_ID: 'db-waba', WA_VERIFY_TOKEN: 'db-verify-fake' } }));
    await s.onModuleInit();
    expect(loadEnv().WA_WABA_ID).toBe('db-waba');
    expect(loadEnv().WA_VERIFY_TOKEN).toBe('db-verify-fake');
    s.onModuleDestroy();
  });

  it('a failed boot load (migration not applied) warns and keeps env-only; it never throws', async () => {
    vi.stubEnv('WA_WABA_ID', 'env-waba');
    const q = fakeQueries();
    q.rawValues.mockRejectedValue(new Error('function public.integration_secrets_read() does not exist'));
    const s = service(q);
    await expect(s.onModuleInit()).resolves.toBeUndefined();
    expect(integrationOverlay()).toEqual({});
    expect(loadEnv().WA_WABA_ID).toBe('env-waba');
    expect(warn).toHaveBeenCalledTimes(1);
    s.onModuleDestroy();
  });

  it('a failed refresh after a good load keeps the last good values', async () => {
    const q = fakeQueries({ raw: { WA_WABA_ID: 'db-waba' } });
    const s = service(q);
    expect(await s.refresh()).toBe(true);
    q.rawValues.mockRejectedValue(new Error('connection lost'));
    expect(await s.refresh()).toBe(false);
    expect(integrationOverlay()).toEqual({ WA_WABA_ID: 'db-waba' });
  });

  it('a bad DB value is dropped with ONE warning naming the key, never the value', async () => {
    const q = fakeQueries({ raw: { WA_API_BASE: 'not-a-url-SENTINEL', WA_WABA_ID: 'w' } });
    const s = service(q);
    await s.refresh();
    await s.refresh();
    expect(integrationOverlay()).toEqual({ WA_WABA_ID: 'w' });
    expect(warn).toHaveBeenCalledTimes(1);
    const text = String(warn.mock.calls[0]?.[0]);
    expect(text).toContain('WA_API_BASE');
    expect(text).not.toContain('SENTINEL');
  });

  it('switched off (INTEGRATION_CONFIG_FROM_DB=false → null): never reads the database', async () => {
    const q = fakeQueries({ raw: { WA_WABA_ID: 'db-waba' } });
    const s = service(q, null);
    await s.onModuleInit();
    await s.writeValues({ WA_WABA_ID: 'x' }, 'admin-id');
    expect(q.rawValues).not.toHaveBeenCalled();
    expect(integrationOverlay()).toEqual({});
  });

  it('refreshes on the timer (unref\'d), at least every second', async () => {
    vi.useFakeTimers();
    try {
      const q = fakeQueries();
      const s = service(q, 0);
      await s.onModuleInit();
      await vi.advanceTimersByTimeAsync(2_100);
      expect(q.rawValues).toHaveBeenCalledTimes(3);
      s.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('IntegrationConfigService: admin writes reload at once', () => {
  it('plain values, then a refresh', async () => {
    const q = fakeQueries();
    const s = service(q);
    q.rawValues.mockResolvedValue({ WA_WABA_ID: 'new' });
    await s.writeValues({ WA_WABA_ID: 'new', FX_API_URL: null }, 'admin-id');
    expect(q.writePlain).toHaveBeenCalledWith({ WA_WABA_ID: 'new', FX_API_URL: null }, 'admin-id');
    expect(integrationOverlay()).toEqual({ WA_WABA_ID: 'new' });
  });

  it('a secret set / clear goes to the queries and reloads, even when the write fails', async () => {
    const q = fakeQueries();
    const s = service(q);
    await s.setSecret({ key: 'WA_APP_SECRET', value: 'fake-secret' });
    expect(q.setSecret).toHaveBeenCalledWith({ key: 'WA_APP_SECRET', value: 'fake-secret' });
    expect(await s.clearSecret('WA_APP_SECRET')).toBe(true);
    q.setSecret.mockRejectedValue(new Error('boom'));
    await expect(s.setSecret({ key: 'WA_APP_SECRET', value: 'x' })).rejects.toThrow('boom');
    expect(q.rawValues).toHaveBeenCalledTimes(3);
  });
});
