import type { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asQueries, fakeQueries } from '../../../common/integrations/integration-config.fakes';
import { IntegrationConfigService } from '../../../common/integrations/integration-config.service';
import { setIntegrationOverlay } from '../../../common/integrations/integration-overlay';
import { DbRulesReader } from '../../messaging/notification-rules';
import { NumbersConfig, OwnNumbers } from '../../messaging/numbers';
import { GoogleConnection, GoogleSettings } from '../google-sync';
import { ConfigReloadJob } from './config-reload.job';

/** The worker's services, each one fake method; `missing` ones are not in the app (ModuleRef throws). */
function worker(missing: readonly unknown[] = []) {
  const fakes = new Map<unknown, Record<string, ReturnType<typeof vi.fn>>>([
    [IntegrationConfigService, { reloadHere: vi.fn(async () => undefined) }],
    [DbRulesReader, { fresh: vi.fn(async () => ({})) }],
    [NumbersConfig, { reload: vi.fn(async () => true) }],
    [OwnNumbers, { forget: vi.fn() }],
    [GoogleSettings, { forget: vi.fn() }],
    [GoogleConnection, { forget: vi.fn() }],
  ]);
  const get = (token: unknown) => {
    const found = fakes.get(token);
    if (!found || missing.includes(token)) throw new Error('not found');
    return found;
  };
  return { fakes, job: new ConfigReloadJob({ get } as unknown as ModuleRef) };
}

function stubFetch(): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: string) => (urls.push(url), Promise.resolve(new Response(null, { status: 204 }))));
  return urls;
}

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  setIntegrationOverlay({});
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ConfigReloadJob (the worker side of an admin save)', () => {
  it('reload() refreshes the integration overlay, the rules (and settings) snapshot, the numbers overlay and own numbers, both Google caches', async () => {
    const { fakes, job } = worker();
    await job.reload();
    const called = [...fakes.values()].map((f) => Object.values(f).every((fn) => fn.mock.calls.length === 1));
    expect(called).toEqual([true, true, true, true, true, true]);
  });

  it('a step that is missing or fails never stops the next', async () => {
    const { fakes, job } = worker([DbRulesReader]);
    fakes.get(IntegrationConfigService)?.reloadHere?.mockRejectedValue(new Error('db down'));
    await expect(job.reload()).resolves.toBeUndefined();
    expect(fakes.get(NumbersConfig)?.reload).toHaveBeenCalledTimes(1);
    expect(fakes.get(GoogleConnection)?.forget).toHaveBeenCalledTimes(1);
  });

  it('api copy: a kick of the job goes to the worker, never reloads here', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    const urls = stubFetch();
    const { fakes, job } = worker();
    await job.reload();
    expect(urls).toEqual(['http://ayat-worker:3000/internal/jobs/config-reload/kick']);
    expect(fakes.get(NumbersConfig)?.reload).not.toHaveBeenCalled();
  });
});

describe('an admin save on an API copy kicks the worker (kickConfigReload)', () => {
  const integration = () => new IntegrationConfigService(asQueries(fakeQueries()), 60_000);

  it('api: reloads here first, then asks the worker', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    const urls = stubFetch();
    const q = fakeQueries();
    await new IntegrationConfigService(asQueries(q), 60_000).writeValues({}, 'admin-1');
    expect(q.rawValues).toHaveBeenCalledTimes(1);
    expect(urls).toEqual(['http://ayat-worker:3000/internal/jobs/config-reload/kick']);
  });

  it('all (one process, today) and no WORKER_URL: nothing is sent', async () => {
    const urls = stubFetch();
    await integration().clearSecret('WA_ACCESS_TOKEN');
    vi.stubEnv('APP_ROLE', 'api');
    await integration().clearSecret('WA_ACCESS_TOKEN');
    expect(urls).toEqual([]);
  });

  it('a Google OFF drops the cache here and kicks the worker', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    const urls = stubFetch();
    const db = { from: () => ({ upsert: async () => ({ error: null }) }) };
    await new GoogleSettings(db as never, 30_000).write({ values: { enabled: false }, actorId: 'admin-1' });
    expect(urls).toEqual(['http://ayat-worker:3000/internal/jobs/config-reload/kick']);
  });
});
