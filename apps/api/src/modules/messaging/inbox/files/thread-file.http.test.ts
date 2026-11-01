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

const PHONE = '+966552147730';
const M1 = 'b1111111-1111-4111-8111-111111111111';
const URL = `/threads/${encodeURIComponent(PHONE)}/messages/${M1}/file`;
const USERS = { admin: ADMIN, sales: SALES, teacher: TEACHER, guardian: { id: 'g9', email: null, role: 'guardian' as const } };
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
  body: 'صورة التحويل',
  created_at: new Date().toISOString(),
  line: null,
  ...over,
});

describe('W6 GET /threads/:phone/messages/:id/file: bubble media for admin and sales (docs/20)', () => {
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
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'image/jpeg' });
    storage.signedDownload.mockResolvedValue({ url: 'http://signed', expires_at: '2026-10-19T11:00:00.000Z' });
    teachers.teacher.mockResolvedValue({ id: 'tt1', display_name_ar: 'أ. سارة', phone_e164: null });
    teachers.phones.mockResolvedValue([PHONE]);
  });

  it('a salesperson gets 200 and a signed url of our copy of that phone\'s file', async () => {
    queries.message.mockResolvedValue(row());
    const res = await call('sales');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ url: 'http://signed', expires_at: '2026-10-19T11:00:00.000Z', mime: 'image/jpeg' });
    expect(queries.message).toHaveBeenCalledWith(M1);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: `${M1}.jpg` });
  });

  it('the admin gets the file too (a cached PDF is signed without a Meta download)', async () => {
    queries.message.mockResolvedValue(row({ media_mime: 'application/pdf', media_path: `${M1}.pdf` }));
    const res = await call('admin');
    expect([res.statusCode, res.json().mime]).toEqual([200, 'application/pdf']);
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('?download=1 («تنزيل») signs the same copy to save under the sent name; no name: a dated one', async () => {
    queries.message.mockResolvedValue(row({ direction: 'outbound', media_path: 'out/a.pdf', media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf' }));
    expect((await call('sales', `${URL}?download=1`)).statusCode).toBe(200);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: 'out/a.pdf', download: 'خطة الحفظ.pdf' });
    queries.message.mockResolvedValue(row({ media_path: `${M1}.jpg`, created_at: '2026-10-26T14:32:00.000Z' }));
    await call('admin', `${URL}?download=1`);
    expect(storage.signedDownload).toHaveBeenLastCalledWith({ bucket: 'wa-media', path: `${M1}.jpg`, download: 'whatsapp-2026-10-26-1432.jpg' });
  });

  it('?download=1 keeps the same rules: a teacher is still 403 media_forbidden', async () => {
    const res = await call('teacher', `${URL}?download=1`);
    expect([res.statusCode, res.json().code]).toEqual([403, 'media_forbidden']);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a message of another phone is 404 message_not_found, and nothing is fetched or signed', async () => {
    queries.message.mockResolvedValue(row({ phone_e164: '+201001234567' }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    expect(client.getMedia).not.toHaveBeenCalled();
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a teacher (even of this family) gets 403 media_forbidden, and the message is never read', async () => {
    const res = await call('teacher');
    expect([res.statusCode, res.json().code]).toEqual([403, 'media_forbidden']);
    expect(queries.message).not.toHaveBeenCalled();
  });

  it('a role without inbox.read is 403 at the gate', async () => {
    const res = await call('guardian');
    expect(res.statusCode).toBe(403);
    expect(res.json().code).not.toBe('media_forbidden');
    expect(queries.message).not.toHaveBeenCalled();
  });

  it('expired media is 410 media_expired', async () => {
    queries.message.mockResolvedValue(row({ created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([410, 'media_expired']);
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('a type no bubble can open (a zip) is never served: 400 invoice_message', async () => {
    queries.message.mockResolvedValue(row({ media_mime: 'application/zip' }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([400, 'invoice_message']);
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('a message hidden from the platform: its file is 404 message_not_found for everyone', async () => {
    queries.message.mockResolvedValue(row({ hidden_at: '2026-10-30T10:00:00.000Z' }));
    for (const who of ['admin', 'sales']) expect((await call(who)).json().code).toBe('message_not_found');
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a bad phone is 400 invalid_phone; a bad message id is 400', async () => {
    expect((await call('sales', `/threads/abc/messages/${M1}/file`)).json()).toMatchObject({ code: 'invalid_phone' });
    expect((await call('sales', `/threads/${encodeURIComponent(PHONE)}/messages/x/file`)).statusCode).toBe(400);
  });
});
