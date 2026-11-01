import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import { StorageService } from '@/common/storage/storage.service';
import { InboundMediaRepo, type MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TeacherThreadsRepo } from '@/modules/messaging/inbox/teacher-threads/teacher-threads.repo';
import { ADMIN, SALES, TEACHER } from '@/modules/messaging/inbox/test-app';

// Owner 2026-10-27: a voice note or video sent from the WhatsApp Business app on the academy phone
// (an echo: outbound with Meta's media id, no stored file) is fetched and cached as an inbound one.

const PHONE = '+966552147730';
const M1 = 'b1111111-1111-4111-8111-111111111111';
const URL = `/threads/${encodeURIComponent(PHONE)}/messages/${M1}/file`;
const USERS = { admin: ADMIN, sales: SALES, teacher: TEACHER };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token as keyof typeof USERS];
  if (!user) throw new Error('bad token');
  return user;
};
const row = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: M1, phone_e164: PHONE, direction: 'inbound', media_id: 'meta-1', media_mime: 'audio/ogg; codecs=opus',
  media_path: null, body: null, created_at: new Date().toISOString(), line: null, ...over,
});
const SENT = `out/${SALES.id}/c1/f1.pdf`;
const echo = (over: Partial<MediaMessage> = {}) => row({ direction: 'outbound', line: 'chat', ...over });

describe('W6 bubble files: echoes of the WhatsApp Business app', () => {
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
      .overrideProvider(TeacherThreadsRepo).useValue(teachers)
      .overrideProvider(WHATSAPP_CLIENT).useValue(client)
      .overrideProvider(WHATSAPP_LINES).useValue({ notifications: client, chat: client })
      .overrideProvider(StorageService).useValue(storage)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    client.configured.mockReturnValue(true);
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'audio/ogg' });
    storage.signedDownload.mockResolvedValue({ url: 'http://signed', expires_at: '2026-10-19T11:00:00.000Z' });
    teachers.teacher.mockResolvedValue({ id: 'tt1', display_name_ar: 'أ. سارة', phone_e164: null });
    teachers.phones.mockResolvedValue([PHONE]);
  });

  it('an echo voice note is fetched by its media id with the chat client, cached once, then signed', async () => {
    queries.message.mockResolvedValue(echo());
    const res = await call('sales');
    expect([res.statusCode, res.json().mime]).toEqual([200, 'audio/ogg']);
    expect(client.getMedia).toHaveBeenCalledWith('meta-1');
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ path: `${M1}.ogg`, contentType: 'audio/ogg' }));
    expect(queries.setPath).toHaveBeenCalledWith(M1, `${M1}.ogg`);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: `${M1}.ogg` });
  });

  it('a cached echo is signed as stored: no second download', async () => {
    queries.message.mockResolvedValue(echo({ media_mime: 'video/mp4', media_path: `${M1}.mp4` }));
    const res = await call('admin', `${URL}?download=1`);
    expect([res.statusCode, res.json().mime]).toEqual([200, 'video/mp4']);
    expect(client.getMedia).not.toHaveBeenCalled();
    expect(storage.signedDownload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'wa-media', path: `${M1}.mp4` }));
  });

  it('a file staff sent (out/…) is still signed as stored, never fetched', async () => {
    queries.message.mockResolvedValue(echo({ media_id: null, media_mime: 'application/pdf', media_path: SENT }));
    expect((await call('sales')).statusCode).toBe(200);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: SENT });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('outbound with neither a file nor a media id (imported history) stays 410 media_expired', async () => {
    queries.message.mockResolvedValue(echo({ media_id: null }));
    expect((await call('sales')).json()).toMatchObject({ code: 'media_expired' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('an echo past the 29 days is 410 media_expired without a call; a type no bubble opens is 400', async () => {
    queries.message.mockResolvedValue(echo({ created_at: new Date(Date.now() - 30 * 86_400_000).toISOString() }));
    expect((await call('sales')).json()).toMatchObject({ code: 'media_expired' });
    queries.message.mockResolvedValue(echo({ media_mime: 'application/zip' }));
    expect((await call('sales')).json()).toMatchObject({ code: 'invoice_message' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('an echo larger than 16 MB is 413 invoice_too_large and never stored', async () => {
    queries.message.mockResolvedValue(echo());
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array(16 * 1024 * 1024 + 1), mime: 'audio/ogg' });
    expect((await call('sales')).json()).toMatchObject({ code: 'invoice_too_large' });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('another phone\'s echo is 404 before any fetch; a teacher is 403 media_forbidden', async () => {
    queries.message.mockResolvedValue(echo({ phone_e164: '+201001234567' }));
    expect((await call('sales')).json()).toMatchObject({ code: 'message_not_found' });
    expect((await call('teacher')).json()).toMatchObject({ code: 'media_forbidden' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('the old CRM number\'s history is 409 crm_no_media, and no client is asked', async () => {
    queries.message.mockResolvedValue(row({ number: { id: 'n-old', provider: 'crm', purpose: 'chat' } }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([409, 'crm_no_media']);
    expect(client.getMedia).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
