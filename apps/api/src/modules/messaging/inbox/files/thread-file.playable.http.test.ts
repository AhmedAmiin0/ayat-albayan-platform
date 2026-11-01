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

// docs/21 D1/D2: W6 serves voice notes, videos and files staff sent; the admin picker does not.

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

describe('W6 bubble files: audio, video and sent files (docs/21 §4)', () => {
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

  it('a salesperson gets 200 for a voice note, cached as .ogg', async () => {
    queries.message.mockResolvedValue(row());
    const res = await call('sales');
    expect([res.statusCode, res.json().mime]).toEqual([200, 'audio/ogg']);
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ path: `${M1}.ogg`, contentType: 'audio/ogg' }));
  });

  it('a salesperson gets 200 for a video', async () => {
    queries.message.mockResolvedValue(row({ media_mime: 'video/mp4', media_path: `${M1}.mp4` }));
    const res = await call('sales');
    expect([res.statusCode, res.json().mime]).toEqual([200, 'video/mp4']);
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('an outbound row with a stored file is signed from wa-media as is, never fetched from WhatsApp', async () => {
    queries.message.mockResolvedValue(row({ direction: 'outbound', media_id: null, media_mime: 'application/pdf', media_path: SENT }));
    const res = await call('sales');
    expect(res.json()).toEqual({ url: 'http://signed', expires_at: '2026-10-19T11:00:00.000Z', mime: 'application/pdf' });
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: SENT });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('an outbound row with no stored file (imported history) is 410 media_expired', async () => {
    queries.message.mockResolvedValue(row({ direction: 'outbound', media_id: null, media_path: null }));
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([410, 'media_expired']);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('another phone\'s outbound file is 404 message_not_found, nothing signed', async () => {
    queries.message.mockResolvedValue(row({ direction: 'outbound', phone_e164: '+201001234567', media_path: SENT }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('an unknown message is 404 message_not_found', async () => {
    queries.message.mockResolvedValue(null);
    expect((await call('sales')).json()).toMatchObject({ code: 'message_not_found' });
  });

  it('a teacher still gets 403 media_forbidden for a voice note', async () => {
    queries.message.mockResolvedValue(row());
    const res = await call('teacher');
    expect([res.statusCode, res.json().code]).toEqual([403, 'media_forbidden']);
    expect(queries.message).not.toHaveBeenCalled();
  });

  it('the admin picker route /media/:id still answers 400 invoice_message for audio', async () => {
    queries.message.mockResolvedValue(row());
    const res = await call('admin', `/threads/${encodeURIComponent(PHONE)}/media/${M1}`);
    expect([res.statusCode, res.json().code]).toEqual([400, 'invoice_message']);
    expect(client.getMedia).not.toHaveBeenCalled();
  });
});
