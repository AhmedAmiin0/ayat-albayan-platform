import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TranslationsService } from '../../modules/translations/translations.service';
import { SettingsService } from '../settings/settings.service';
import { ConfigSeeder } from './boundaries/config-seeder';
import { ConfigStore } from './store/config-store.service';

describe('ConfigStoreModule wiring', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('one ConfigStore behind SettingsService, the overrides reload wired in, boot touches no network', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const store = app.get(ConfigStore);
    expect(Reflect.get(app.get(SettingsService), 'store')).toBe(store);
    expect(app.get(ConfigSeeder)).toBeInstanceOf(ConfigSeeder);
    const refresh = vi.spyOn(app.get(TranslationsService), 'refresh').mockResolvedValue(true);
    const reload = Reflect.get(store, 'refreshOverrides') as () => Promise<unknown>;
    await reload();
    expect(refresh).toHaveBeenCalledTimes(1);
    await app.close();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
