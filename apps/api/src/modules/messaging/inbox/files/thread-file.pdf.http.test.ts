import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import { StorageService } from '@/common/storage/storage.service';
import { InboundMediaRepo, type MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TeacherThreadsQueries } from '@/modules/messaging/inbox/teacher-threads/teacher-threads.queries';
import { ADMIN, SALES, TEACHER } from '@/modules/messaging/inbox/test-app';
import { PdfPreviewQueries } from './pdf/pdf-preview.queries';

// No poppler here: every 200 is «already probed, already rendered» (storage.exists true), so nothing is spawned.
const PHONE = '+966552147730';
const M1 = 'b1111111-1111-4111-8111-111111111111';
const BASE = `/threads/${encodeURIComponent(PHONE)}/messages/${M1}`;
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
  media_mime: 'application/pdf',
  media_path: `${M1}.pdf`,
  body: null,
  created_at: new Date().toISOString(),
  line: null,
  ...over,
});
const SIGNED = { url: 'http://signed', expires_at: '2026-10-29T13:00:00.000Z' };

describe('GET /threads/:phone/messages/:id/pdf/:page: a PDF page under the file route\'s own rules', () => {
  let app: NestFastifyApplication;
  const queries = { message: vi.fn(), recent: vi.fn(), setPath: vi.fn() };
  const pdfs = { doc: vi.fn(), setDoc: vi.fn() };
  const teachers = { teacher: vi.fn(), phones: vi.fn() };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const storage = { upload: vi.fn(), signedDownload: vi.fn(), exists: vi.fn(), download: vi.fn() };
  const call = (token: string, url = `${BASE}/pdf/1`) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(InboundMediaRepo).useValue(queries)
      .overrideProvider(PdfPreviewQueries).useValue(pdfs)
      .overrideProvider(TeacherThreadsQueries).useValue(teachers)
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
    storage.signedDownload.mockResolvedValue(SIGNED);
    storage.exists.mockResolvedValue(true);
    teachers.teacher.mockResolvedValue({ id: 'tt1', display_name_ar: 'أ. سارة', phone_e164: null });
    teachers.phones.mockResolvedValue([PHONE]);
    queries.message.mockResolvedValue(row());
    pdfs.doc.mockResolvedValue({ pages: 12, bytes: 1_234_567 });
  });

  it('the same scope as «تنزيل» / the file: admin and sales 200, a teacher 403 media_forbidden, no inbox.read 403', async () => {
    for (const url of [`${BASE}/file`, `${BASE}/pdf/1`]) {
      const codes = await Promise.all(['admin', 'sales', 'teacher', 'guardian'].map(async (who) => (await call(who, url)).statusCode));
      expect([url, codes]).toEqual([url, [200, 200, 403, 403]]);
    }
    expect((await call('teacher')).json().code).toBe('media_forbidden');
  });

  it('200: the page signed, with the PDF\'s page count and size', async () => {
    const res = await call('sales', `${BASE}/pdf/3`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...SIGNED, page: 3, pages: 12, bytes: 1_234_567 });
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: `pdf/${M1}/3.jpg` });
  });

  it('a teacher (even of this family) is refused before the message is read', async () => {
    await call('teacher');
    expect(queries.message).not.toHaveBeenCalled();
  });

  it('another phone\'s message is 404 message_not_found, and nothing is signed', async () => {
    queries.message.mockResolvedValue(row({ phone_e164: '+201001234567' }));
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('an imported outbound row with no file is 410 media_expired, as /file says', async () => {
    queries.message.mockResolvedValue(row({ direction: 'outbound', media_id: null, media_path: null }));
    const res = await call('sales');
    expect([res.statusCode, res.json().code]).toEqual([410, 'media_expired']);
    expect(pdfs.doc).not.toHaveBeenCalled();
  });

  it('a page outside 1..30 or not a number is 400; past the PDF\'s own pages is 400 page_out_of_range', async () => {
    for (const page of ['0', '31', 'x', '1.5']) expect((await call('admin', `${BASE}/pdf/${page}`)).statusCode).toBe(400);
    const res = await call('admin', `${BASE}/pdf/13`);
    expect([res.statusCode, res.json().code]).toEqual([400, 'page_out_of_range']);
  });

  it('no preview (encrypted, broken) is 422 pdf_no_preview; a photo is 400 invoice_message', async () => {
    pdfs.doc.mockResolvedValue({ pages: 0, bytes: 99 });
    expect((await call('admin')).json()).toMatchObject({ code: 'pdf_no_preview' });
    queries.message.mockResolvedValue(row({ media_mime: 'image/jpeg', media_path: `${M1}.jpg` }));
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([400, 'invoice_message']);
  });

  it('a storage blip on the first render is 503 pdf_render_failed, never 410', async () => {
    pdfs.doc.mockResolvedValue(null);
    storage.download.mockResolvedValue(null);
    const res = await call('admin');
    expect([res.statusCode, res.json().code]).toEqual([503, 'pdf_render_failed']);
    expect(pdfs.setDoc).not.toHaveBeenCalled();
  });
});
