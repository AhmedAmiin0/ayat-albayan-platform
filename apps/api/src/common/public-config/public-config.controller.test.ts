import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver } from '../auth/auth.guard';
import { CustomConfigService } from '../custom-config/custom-config.service';
import { fakeConfigStore } from '../config-store/config-store.fakes';
import type { Db } from '../db/db.module';
import { SettingsService } from '../settings/settings.service';

const settings = { publicView: vi.fn() };
const custom = { publicRows: vi.fn() };

/** A real SettingsService over `rows` (no cache), for the public subset it computes. */
function realSettings(rows: { key: string; value: unknown }[]): SettingsService {
  const select = vi.fn().mockResolvedValue({ data: rows, error: null });
  return new SettingsService({ from: () => ({ select }) } as unknown as Db, 0, fakeConfigStore());
}

describe('GET /settings/public (no login)', () => {
  let app: NestFastifyApplication;
  const get = () => app.inject({ method: 'GET', url: '/settings/public' });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(CustomConfigService).useValue(custom)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    custom.publicRows.mockResolvedValue([]);
  });

  it('needs no login and returns only the public keys; browsers may keep it a minute', async () => {
    settings.publicView.mockResolvedValue({ join_opens_before_min: 10 });
    const res = await get();
    expect([res.statusCode, res.json()]).toEqual([200, { join_opens_before_min: 10, custom: {} }]);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('adds the custom entries flagged public, never a private or shadowing row', async () => {
    settings.publicView.mockResolvedValue({ join_opens_before_min: 10 });
    custom.publicRows.mockResolvedValue([
      { key: 'promo', value: { text: 'hi' }, is_public: true },
      { key: 'internal.note', value: 'x', is_public: false },
      { key: 'messaging_enabled', value: 'shadow', is_public: true },
    ]);
    expect((await get()).json()).toEqual({ join_opens_before_min: 10, custom: { promo: { text: 'hi' } } });
  });

  it('serves the registry public subset, defaults filled, and no private setting', async () => {
    const real = realSettings([{ key: 'upload_max_mb', value: 4 }, { key: 'messaging_enabled', value: true }]);
    settings.publicView.mockImplementation(() => real.publicView());
    const body = (await get()).json();
    expect(body).toEqual({ ...PUBLIC_SETTING_DEFAULTS, upload_max_mb: 4, custom: {} });
    expect(body).not.toHaveProperty('messaging_enabled');
  });

  it('a bearer token changes nothing: the route stays public', async () => {
    settings.publicView.mockResolvedValue({ join_opens_before_min: 10 });
    const res = await app.inject({ method: 'GET', url: '/settings/public', headers: { authorization: 'Bearer junk' } });
    expect(res.statusCode).toBe(200);
  });
});
