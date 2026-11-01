import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { StorageService } from '@/common/storage/storage.service';
import { CRM_HOST, crmResponse, crmRow, stubFetch } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history.fakes';
import { InboundMediaRepo } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TeacherThreadsQueries } from '@/modules/messaging/inbox/teacher-threads/teacher-threads.queries';
import { ADMIN, SALES, TEACHER } from '@/modules/messaging/inbox/test-app';

// Owner 2026-10-27: a photo imported from the old CRM opens in the bubble (web and mobile): fetched
// once from the configured CRM storage host, cached in wa-media, then signed like any inbound file.
const PHONE = '+966552147730';
const M1 = 'b1111111-1111-4111-8111-111111111111';
const URL = `/threads/${encodeURIComponent(PHONE)}/messages/${M1}/file`;
const USERS = { admin: ADMIN, sales: SALES, teacher: TEACHER };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token as keyof typeof USERS];
  if (!user) throw new Error('bad token');
  return user;
};

describe('W6 file of a message imported from the old CRM', () => {
  let app: NestFastifyApplication;
  const queries = { message: vi.fn(), recent: vi.fn(), setPath: vi.fn() };
  const teachers = { teacher: vi.fn(), phones: vi.fn() };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const storage = { upload: vi.fn(), signedDownload: vi.fn() };
  const call = (token: string, url = URL) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(InboundMediaRepo).useValue(queries)
      .overrideProvider(TeacherThreadsQueries).useValue(teachers)
      .overrideProvider(WHATSAPP_CLIENT).useValue(client)
      .overrideProvider(WHATSAPP_LINES).useValue({ notifications: client, chat: client })
      .overrideProvider(StorageService).useValue(storage)
      .overrideProvider(SettingsService).useValue(fakeSettings({ crm_media_host: CRM_HOST }))
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.resetAllMocks();
    storage.signedDownload.mockResolvedValue({ url: 'http://signed', expires_at: '2026-10-27T11:00:00.000Z' });
    teachers.teacher.mockResolvedValue({ id: 'tt1', display_name_ar: 'أ. سارة', phone_e164: null });
    teachers.phones.mockResolvedValue([PHONE]);
  });

  it('the admin gets a signed url of our copy: fetched once from the CRM host, cached, Meta never called', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    queries.message.mockResolvedValue(crmRow({ id: M1 }));
    const res = await call('admin');
    expect([res.statusCode, res.json().mime]).toEqual([200, 'image/webp']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'wa-media', path: `${M1}.webp` }));
    expect(queries.setPath).toHaveBeenCalledWith(M1, `${M1}.webp`);
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('cached: signed from wa-media under the dated name (?download=1), nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    queries.message.mockResolvedValue(crmRow({ id: M1, media_path: `${M1}.webp`, created_at: '2026-09-10T08:00:00.000Z' }));
    expect((await call('sales', `${URL}?download=1`)).statusCode).toBe(200);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: `${M1}.webp`, download: 'whatsapp-2026-09-10-0800.webp' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('another phone\'s message is 404 message_not_found, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    queries.message.mockResolvedValue(crmRow({ id: M1, phone_e164: '+201001234567' }));
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    expect([fetch.mock.calls.length, storage.upload.mock.calls.length]).toEqual([0, 0]);
  });

  it('a teacher is 403 media_forbidden, the message never read, nothing fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(4));
    const res = await call('teacher');
    expect([res.statusCode, res.json().code]).toEqual([403, 'media_forbidden']);
    expect([queries.message.mock.calls.length, fetch.mock.calls.length]).toEqual([0, 0]);
  });

  it('the CRM storage answers 404 → 410 media_expired, nothing stored', async () => {
    stubFetch(async () => crmResponse(0, {}, 404));
    queries.message.mockResolvedValue(crmRow({ id: M1 }));
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([410, 'media_expired']);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
