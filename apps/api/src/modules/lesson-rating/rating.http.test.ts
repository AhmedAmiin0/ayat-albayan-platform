import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { Outbox } from '../inbox/outbox';
import { TemplateRegistry } from '../whatsapp/templates/catalog/template.registry';
import { guardian, heldLesson, LESSON_ID, PHONE } from './rating.fakes';
import { RatingQueries } from './rating.queries';

// POST /threads/:phone/rating «إرسال تقييم الحلقة»: real controller, guard and service; DB mocked.

const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
const TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
const verify: TokenVerifier = async (token) => (token === 'admin' ? ADMIN : TEACHER);
const URL = `/threads/${encodeURIComponent(PHONE)}/rating`;
const REQ = '5f0c2c4e-1b2a-4c3d-9e8f-0a1b2c3d4e5f';

const m = {
  queries: { guardianByPhone: vi.fn(), latestHeld: vi.fn(), approved: vi.fn(), held: vi.fn(), byIds: vi.fn(), queue: vi.fn() },
  templates: { approved: vi.fn(), boot: vi.fn() },
  outbox: { send: vi.fn() },
  audit: { record: vi.fn() },
};

describe('POST /threads/:phone/rating', () => {
  let app: NestFastifyApplication;
  const call = (body: object, token = 'admin') =>
    app.inject({ method: 'POST', url: URL, headers: { authorization: `Bearer ${token}` }, payload: body });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(RatingQueries).useValue(m.queries)
      .overrideProvider(TemplateRegistry).useValue(m.templates)
      .overrideProvider(Outbox).useValue(m.outbox)
      .overrideProvider(AuditService).useValue(m.audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    m.templates.approved.mockResolvedValue({ key: 'lesson_rating', status: 'approved' });
    m.queries.guardianByPhone.mockResolvedValue(guardian);
    m.queries.latestHeld.mockResolvedValue(heldLesson());
    m.outbox.send.mockResolvedValue({ replayed: false, view: { id: 'msg1', phone_e164: PHONE, template_key: 'lesson_rating', lesson_id: LESSON_ID, status: 'queued' } });
  });

  it('queues lesson_rating for the latest lesson that took place, as the admin (not held by the switch), audited', async () => {
    const res = await call({ clientRequestId: REQ });
    expect(res.statusCode).toBe(201);
    expect(m.outbox.send).toHaveBeenCalledWith({
      phone_e164: PHONE,
      guardian_id: guardian.id,
      lesson_id: LESSON_ID,
      template_key: 'lesson_rating',
      template_params: { '1': 'سهيلة', '2': 'الأحد 4 أكتوبر', payloads: expect.arrayContaining([`rate_good:${LESSON_ID}`]) },
      dedup_key: `admin:${PHONE}:rating:${REQ}`,
      created_by: ADMIN.id,
    });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'thread_rating', entityId: 'msg1' }));
  });

  it('a retried request id is a replay: no second audit row', async () => {
    m.outbox.send.mockResolvedValue({ replayed: true, view: { id: 'msg1', status: 'sent' } });
    expect((await call({ clientRequestId: REQ })).statusCode).toBe(201);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'template not approved', arrange: () => m.templates.approved.mockResolvedValue(null), status: 409, code: 'template_not_approved' },
    { name: 'not a guardian', arrange: () => m.queries.guardianByPhone.mockResolvedValue(null), status: 404, code: 'not_a_guardian' },
    { name: 'no lesson took place yet', arrange: () => m.queries.latestHeld.mockResolvedValue(null), status: 404, code: 'no_completed_lesson' },
  ])('$name → $status $code, nothing queued', async ({ arrange, status, code }) => {
    arrange();
    const res = await call({ clientRequestId: REQ });
    expect([res.statusCode, res.json().code]).toEqual([status, code]);
    expect(m.outbox.send).not.toHaveBeenCalled();
  });

  it('400 without a request id (rule 8); 403 for a teacher', async () => {
    expect((await call({})).statusCode).toBe(400);
    expect((await call({ clientRequestId: REQ }, 'teacher')).statusCode).toBe(403);
    expect(m.outbox.send).not.toHaveBeenCalled();
  });
});
