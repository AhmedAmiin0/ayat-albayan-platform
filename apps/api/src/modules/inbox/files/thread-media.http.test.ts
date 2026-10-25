import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import { StorageService } from '../../../common/storage/storage.service';
import { InboundMediaQueries, type MediaMessage } from '../../whatsapp/messages/inbound-media.queries';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '../../whatsapp/whatsapp.types';
import { ADMIN, TEACHER } from '../test-app';

const PHONE = '+966552147730';
const URL_PHONE = encodeURIComponent(PHONE);
const M1 = 'b1111111-1111-4111-8111-111111111111';
const M_OTHER = 'b2222222-2222-4222-8222-222222222222';
const USERS = { admin: ADMIN, teacher: TEACHER };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token as keyof typeof USERS];
  if (!user) throw new Error('bad token');
  return user;
};
const row = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: M1,
  phone_e164: PHONE,
  direction: 'inbound',
  media_id: 'meta-1',
  media_mime: 'image/jpeg',
  media_path: null,
  body: 'الفاتورة',
  created_at: new Date().toISOString(),
  line: null,
  ...over,
});

describe('thread media routes (R-MSG-06): admin only', () => {
  let app: NestFastifyApplication;
  const queries = { message: vi.fn(), recent: vi.fn(), setPath: vi.fn() };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const chatClient = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const storage = { upload: vi.fn(), signedDownload: vi.fn() };
  const call = (url: string, token = 'admin') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(InboundMediaQueries).useValue(queries)
      .overrideProvider(WHATSAPP_CLIENT).useValue(client)
      .overrideProvider(WHATSAPP_LINES).useValue({ notifications: client, chat: chatClient })
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
    chatClient.configured.mockReturnValue(true);
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'image/jpeg' });
    chatClient.getMedia.mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'image/jpeg' });
    storage.signedDownload.mockResolvedValue({ url: 'http://signed', expires_at: '2026-10-03T11:00:00.000Z' });
  });

  it('lists the chat\'s images and PDFs (newest first, metadata only); other mimes are left out', async () => {
    const old = new Date(Date.now() - 29.5 * 86_400_000).toISOString();
    queries.recent.mockResolvedValue([
      row(),
      row({ id: M_OTHER, media_mime: 'audio/ogg' }),
      row({ id: 'b3333333-3333-4333-8333-333333333333', media_mime: 'application/pdf', created_at: old, body: null }),
    ]);
    const res = await call(`/threads/${URL_PHONE}/media`);
    expect(res.statusCode).toBe(200);
    const items = res.json();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ message_id: M1, mime: 'image/jpeg', caption: 'الفاتورة', expired: false });
    expect(items[1]).toMatchObject({ mime: 'application/pdf', caption: null, expired: true });
    expect(queries.recent).toHaveBeenCalledWith(expect.objectContaining({ phone: PHONE, limit: 50 }));
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('a teacher gets 403 on both routes, and nothing is read', async () => {
    expect((await call(`/threads/${URL_PHONE}/media`, 'teacher')).statusCode).toBe(403);
    expect((await call(`/threads/${URL_PHONE}/media/${M1}`, 'teacher')).statusCode).toBe(403);
    expect(queries.recent).not.toHaveBeenCalled();
    expect(queries.message).not.toHaveBeenCalled();
  });

  it('a bad phone is 400 invalid_phone; a bad message id is 400', async () => {
    expect((await call('/threads/abc/media')).json()).toMatchObject({ code: 'invalid_phone' });
    expect((await call(`/threads/${URL_PHONE}/media/not-a-uuid`)).statusCode).toBe(400);
  });

  it('a file: downloaded on first use, cached, then a signed URL of our copy', async () => {
    queries.message.mockResolvedValue(row());
    const res = await call(`/threads/${URL_PHONE}/media/${M1}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ url: 'http://signed', expires_at: '2026-10-03T11:00:00.000Z', mime: 'image/jpeg' });
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'wa-media', path: `${M1}.jpg` }));
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: `${M1}.jpg` });
  });

  it('a message of another phone is 404, and nothing is fetched from Meta', async () => {
    queries.message.mockResolvedValue(row({ phone_e164: '+201001234567' }));
    const res = await call(`/threads/${URL_PHONE}/media/${M1}`);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'message_not_found' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('a chat file is fetched with the chat line; chat unconfigured → 503 line_not_configured', async () => {
    queries.message.mockResolvedValue(row({ line: 'chat' }));
    expect((await call(`/threads/${URL_PHONE}/media/${M1}`)).statusCode).toBe(200);
    expect([chatClient.getMedia.mock.calls, client.getMedia.mock.calls]).toEqual([[['meta-1']], []]);
    chatClient.configured.mockReturnValue(false);
    const res = await call(`/threads/${URL_PHONE}/media/${M1}`);
    expect([res.statusCode, res.json().code]).toEqual([503, 'line_not_configured']);
    expect(chatClient.getMedia).toHaveBeenCalledTimes(1);
  });

  it('an expired file is 410 media_expired', async () => {
    queries.message.mockResolvedValue(row({ created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }));
    const res = await call(`/threads/${URL_PHONE}/media/${M1}`);
    expect(res.statusCode).toBe(410);
    expect(res.json()).toMatchObject({ code: 'media_expired' });
  });
});
