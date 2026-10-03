import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { IDS } from './booking.fakes';
import { BookingInvoices } from './booking.invoice';
import { BookingService } from './booking.service';
import { MakeupCandidates } from './makeup-candidates.service';

const REQ = 'c1111111-1111-4111-8111-111111111111';
const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const booking = { book: vi.fn(), check: vi.fn() };
const invoices = { uploadUrl: vi.fn() };
const makeup = { list: vi.fn() };
const RULE = { teacherId: IDS.teacher, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-04' };

describe('booking routes for the invoice and the makeup (R-PAY-03, R-SCH-10)', () => {
  let app: NestFastifyApplication;
  const call = (opts: { method?: 'GET' | 'POST'; url: string; payload?: object; token?: string }) =>
    app.inject({
      method: opts.method ?? 'GET',
      url: opts.url,
      payload: opts.payload,
      headers: { authorization: `Bearer ${opts.token ?? 'admin'}` },
    });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(BookingService).useValue(booking)
      .overrideProvider(BookingInvoices).useValue(invoices)
      .overrideProvider(MakeupCandidates).useValue(makeup)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('both new GET / POST routes are admin only', async () => {
    const upload = { method: 'POST' as const, url: '/booking/invoice-upload-url', token: 'teacher', payload: {} };
    expect((await call(upload)).statusCode).toBe(403);
    expect((await call({ url: `/booking/makeup-candidates?studentId=${IDS.s1}`, token: 'teacher' })).statusCode).toBe(403);
    expect(invoices.uploadUrl).not.toHaveBeenCalled();
    expect(makeup.list).not.toHaveBeenCalled();
  });

  it('invoice-upload-url: 200 with a signed upload for image / PDF up to 10 MB', async () => {
    invoices.uploadUrl.mockResolvedValue({ bucket: 'invoices', path: `${REQ}/x.png`, token: 't', signed_url: 'u' });
    const payload = { clientRequestId: REQ, mime: 'image/png', size: 2048 };
    const res = await call({ method: 'POST', url: '/booking/invoice-upload-url', payload });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ bucket: 'invoices' });
    expect(invoices.uploadUrl).toHaveBeenCalledWith(payload);
  });

  it.each([
    ['audio', { mime: 'audio/mpeg', size: 10 }, 'invoice_type'],
    ['over 10 MB', { mime: 'image/png', size: 10 * 1024 * 1024 + 1 }, 'invoice_too_large'],
  ])('invoice-upload-url: %s → 400 %s', async (_name, over, message) => {
    const res = await call({ method: 'POST', url: '/booking/invoice-upload-url', payload: { clientRequestId: REQ, ...over } });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues[0].message).toBe(message);
    expect(invoices.uploadUrl).not.toHaveBeenCalled();
  });

  it('makeup-candidates: the student\'s missed lessons; the studentId is required', async () => {
    makeup.list.mockResolvedValue([{ lesson_id: IDS.missed }]);
    const res = await call({ url: `/booking/makeup-candidates?studentId=${IDS.s1}` });
    expect(res.json()).toEqual([{ lesson_id: IDS.missed }]);
    expect(makeup.list).toHaveBeenCalledWith(IDS.s1);
    expect((await call({ url: '/booking/makeup-candidates' })).statusCode).toBe(400);
  });

  it('/check needs no invoice (it runs before one exists)', async () => {
    booking.check.mockResolvedValue([]);
    const res = await call({ method: 'POST', url: '/booking/check', payload: { ...RULE, package: '8', studentIds: [IDS.s1] } });
    expect(res.statusCode).toBe(200);
    expect(booking.check).toHaveBeenCalledTimes(1);
  });

  it('POST books a makeup without a package; the body is validated as one student + the missed lesson', async () => {
    booking.book.mockResolvedValue({ rule_id: 'R1' });
    const makeupBody = { ...RULE, kind: 'makeup', studentIds: [IDS.s1], makeupOfLessonId: IDS.missed, clientRequestId: REQ };
    const ok = await call({ method: 'POST', url: '/booking', payload: { ...makeupBody, invoice: { source: 'whatsapp', messageId: IDS.s3 } } });
    expect(ok.statusCode).toBe(201);
    expect(booking.book).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'makeup', makeupOfLessonId: IDS.missed, invoice: { source: 'whatsapp', messageId: IDS.s3 } }),
      USERS['admin']?.id,
    );
    const two = await call({ method: 'POST', url: '/booking', payload: { ...makeupBody, studentIds: [IDS.s1, IDS.s2] } });
    expect(two.json().issues[0].message).toBe('makeup_one_student');
    const noLesson = await call({ method: 'POST', url: '/booking', payload: { ...makeupBody, makeupOfLessonId: undefined } });
    expect(noLesson.json().issues[0].message).toBe('makeup_lesson_required');
  });
});
