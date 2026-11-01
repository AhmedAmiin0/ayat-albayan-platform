import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { SalesQueries } from '@/modules/sales/sales/sales.queries';
import { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { BODY, CLASH, RULE_A, RULE_B, S1, SUB, SUB_ID } from './course-change.fakes';
import { CourseLessonQueries } from './course-change.lessons';
import { CourseChangeQueries } from './course-change.queries';
import { CourseChangeWriter } from './course-change.writer';

// «تغيير أيام الحلقات» with sales.renew_any (owner 2026-11-01, docs/16 row 38): ANY student's
// course, another assistant's (S1 is salesA's) or nobody's (S2), never over a clash.
const A = 'a1000000-0000-4000-8000-00000000000a';
const B = 'b1000000-0000-4000-8000-00000000000b';
const D = 'd1000000-0000-4000-8000-00000000000d';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const USERS: Record<string, AuthUser> = {
  holder: { id: B, email: null, role: 'sales' },
  plain: { id: D, email: null, role: 'sales' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const resolver: PermissionResolver = async (user) => [
  ...(await systemResolver(user)),
  ...(user.id === B ? ['sales.renew_any' as const] : []),
];
const OWN_A = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const RESULT = { subscriptionId: SUB_ID, ruleIds: ['n1', 'n2'], endsOn: '2026-11-17' };
const CHANGE = '/sales/booking/course/change';

describe('POST /sales/booking/course/change[/check] with sales.renew_any', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const checker = { check: vi.fn() };
  const writer = { replay: vi.fn(), apply: vi.fn() };
  const queries = {
    subscription: vi.fn(), rules: vi.fn(), others: vi.fn(),
    contacts: vi.fn(), teacherLink: vi.fn(), teacherMode: vi.fn(),
  };
  const lessons = { ofCourse: vi.fn(), openFrom: vi.fn(), held: vi.fn() };
  const post = (token: string, url: string, body: object) =>
    app.inject({ method: 'POST', url, payload: body, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings({ sales_auto_assign: true }))
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

  it.each([
    ['another assistant’s student', S1],
    ['a student nobody brought', S2],
  ])('with the key, %s: check 200, change 201, written with her as the actor', async (_, id) => {
    queries.subscription.mockResolvedValue({ ...SUB, student_id: id });
    const check = await post('holder', `${CHANGE}/check`, BODY);
    expect([check.statusCode, check.json()]).toEqual([200, { conflicts: [], remaining: 8, endsOn: '2026-11-17' }]);
    const res = await post('holder', CHANGE, BODY);
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
    const written = expect.objectContaining({ payload: expect.objectContaining({ actor: B }) });
    expect(writer.apply).toHaveBeenCalledWith(written);
    expect(sales.ownership).not.toHaveBeenCalled();
  });

  it('without the key both stay 403 not_your_student and nothing is written', async () => {
    for (const id of [S1, S2]) {
      queries.subscription.mockResolvedValue({ ...SUB, student_id: id });
      expect((await post('plain', `${CHANGE}/check`, BODY)).json().code).toBe('not_your_student');
      expect((await post('plain', CHANGE, BODY)).json().code).toBe('not_your_student');
    }
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('the key never overrides a clash: 409 conflict, and a reason is 403 override_not_allowed', async () => {
    queries.subscription.mockResolvedValue({ ...SUB, student_id: S2 });
    checker.check.mockResolvedValue([CLASH]);
    const blocked = await post('holder', CHANGE, BODY);
    expect([blocked.statusCode, blocked.json().code, blocked.json().conflicts]).toEqual([409, 'conflict', [CLASH]]);
    const reason = await post('holder', CHANGE, { ...BODY, override: { reason: 'سبب' } });
    expect(reason.json().code).toBe('override_not_allowed');
    expect(writer.apply).not.toHaveBeenCalled();
  });
});
