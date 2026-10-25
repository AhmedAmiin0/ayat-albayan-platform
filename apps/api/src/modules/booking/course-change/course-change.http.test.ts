import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import type { AuthUser } from '../../../common/auth/verify-token';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { SalesQueries } from '../../sales/sales.queries';
import { ConflictChecker } from '../../scheduling/conflict-checker';
import { BODY, CLASH, RULE_A, RULE_B, S1, SUB, SUB_ID } from './course-change.fakes';
import { CourseLessonQueries } from './course-change.lessons';
import { CourseChangeQueries } from './course-change.queries';
import { CourseChangeWriter } from './course-change.writer';

// «تغيير أيام الحلقات» over HTTP (owner 2026-10-18): the routes, their permissions and codes.
const A = 'a1000000-0000-4000-8000-00000000000a';
const C = 'c1000000-0000-4000-8000-00000000000c';
const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: 'b1000000-0000-4000-8000-00000000000b', email: null, role: 'sales' },
  noMoney: { id: C, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const resolver: PermissionResolver = async (user) => (user.id === C ? ['self.sales'] : systemResolver(user));
const OWN_A = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const RESULT = { subscriptionId: SUB_ID, ruleIds: ['n1', 'n2'], endsOn: '2026-11-17' };

describe('POST /sales/booking/course/change and /booking/course/change', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const checker = { check: vi.fn() };
  const writer = { replay: vi.fn(), apply: vi.fn() };
  const queries = { subscription: vi.fn(), rules: vi.fn(), others: vi.fn(), contacts: vi.fn(), teacherLink: vi.fn(), teacherMode: vi.fn() };
  const lessons = { ofCourse: vi.fn(), openFrom: vi.fn(), held: vi.fn() };
  const post = (token: string, url: string, body: object) =>
    app.inject({ method: 'POST', url, payload: body, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings({ sales_auto_assign: false }))
      .overrideProvider(ConflictChecker).useValue(checker)
      .overrideProvider(CourseChangeQueries).useValue(queries)
      .overrideProvider(CourseLessonQueries).useValue(lessons)
      .overrideProvider(CourseChangeWriter).useValue(writer)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);
  afterAll(() => app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] });
    vi.resetAllMocks();
    sales.ownership.mockImplementation(async (id: string) => (id === A ? OWN_A : NONE));
    checker.check.mockResolvedValue([]);
    writer.replay.mockResolvedValue(null);
    writer.apply.mockResolvedValue(RESULT);
    queries.subscription.mockResolvedValue(SUB);
    queries.rules.mockResolvedValue([RULE_A, RULE_B]);
    queries.others.mockResolvedValue([]);
    lessons.ofCourse.mockResolvedValue([]);
    lessons.openFrom.mockResolvedValue([]);
    lessons.held.mockResolvedValue(new Set(['ra:2026-10-19', 'rb:2026-10-21']));
    queries.contacts.mockResolvedValue([]);
    queries.teacherLink.mockResolvedValue(null);
    queries.teacherMode.mockResolvedValue(null);
  });

  it('her student: check → 200 remaining + end; change → 201 the new rules', async () => {
    const check = await post('salesA', '/sales/booking/course/change/check', BODY);
    expect([check.statusCode, check.json()]).toEqual([200, { conflicts: [], remaining: 8, endsOn: '2026-11-17' }]);
    const res = await post('salesA', '/sales/booking/course/change', BODY);
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
  });

  it('403: another’s student (not_your_student), no self.sales_money, a reason to override', async () => {
    expect((await post('salesB', '/sales/booking/course/change', BODY)).json().code).toBe('not_your_student');
    expect((await post('noMoney', '/sales/booking/course/change', BODY)).statusCode).toBe(403);
    expect((await post('salesA', '/sales/booking/course/change', { ...BODY, override: { reason: 'سبب' } })).json().code).toBe('override_not_allowed');
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('a clash: 409 conflict for her; the admin books it with a reason', async () => {
    checker.check.mockResolvedValue([CLASH]);
    const blocked = await post('salesA', '/sales/booking/course/change', BODY);
    expect([blocked.statusCode, blocked.json().code, blocked.json().conflicts]).toEqual([409, 'conflict', [CLASH]]);
    expect((await post('admin', '/booking/course/change', BODY)).statusCode).toBe(409);
    expect((await post('admin', '/booking/course/change', { ...BODY, override: { reason: 'سبب' } })).statusCode).toBe(201);
  });

  it('400 validation: no clientRequestId on the change; the assistant cannot use the admin route', async () => {
    const noId: Partial<typeof BODY> = { ...BODY };
    delete noId.clientRequestId;
    expect((await post('salesA', '/sales/booking/course/change', noId)).statusCode).toBe(400);
    expect((await post('salesA', '/booking/course/change', BODY)).statusCode).toBe(403);
  });
});
