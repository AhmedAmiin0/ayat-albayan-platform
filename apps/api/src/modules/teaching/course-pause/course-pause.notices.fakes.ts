// HTTP harness for the pause / resume notices (test-only, excluded from the build by *.fakes.ts):
// the real CoursePauseFollowUps and ScheduleNotices; the RPCs, the lessons back, the balance
// alerts, the rules, the bell and the notices' own reads are fakes (no DB).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import { PushService } from '@/common/push/push.service';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { SubscriptionAlertsService } from '@/modules/finance/subscriptions';
import { NotificationPolicy, type RulesReader } from '@/modules/messaging/notification-rules';
import { ScheduleNoticesRepo } from '@/modules/teaching/schedule-notices';
import { pauseMocks, resetPauseMocks, verify } from './course-pause.fakes';
import { CoursePauseLessonsBack } from './course-pause.lessons-back';
import { CoursePauseQueries } from './course-pause.queries';

const guardian = { id: 'G1', name: 'أم سهيلة', phone_e164: '+447700900001', tz: 'Europe/London', profile_id: 'pG1' };
export const TEACHER = {
  id: 'T1', profile_id: 'pT1', phone_e164: '+201000000001', tz: 'Africa/Cairo',
  display_name_ar: 'أبرار', status: 'active' as const, profile: { disabled_at: null },
};
const student = { id: 'S1', name: 'سهيلة', tz: 'Europe/London', profile_id: null, guardian };

/** The rules as stored: none (every row on by default). */
const rules = { snapshot: async () => ({ mode: 'legacy', rows: new Map(), settings: {} }) };

function noticeMocks() {
  return {
    lesson: vi.fn(), student: vi.fn(async () => student), lessons: vi.fn(), nextLesson: vi.fn(),
    // The rules the pause held: the resumed course's first lesson back is read on them only.
    pauseRules: vi.fn(async () => ['R1']),
    approved: vi.fn(async () => true),
    queue: vi.fn(async (rows: readonly unknown[]) => rows.length),
  };
}

export async function pauseNoticesApp() {
  const m = { ...pauseMocks(), notices: noticeMocks(), push: { notifyProfiles: vi.fn() } };
  const policy = new NotificationPolicy(rules as unknown as RulesReader);
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(CoursePauseQueries).useValue(m.queries)
    .overrideProvider(CoursePauseLessonsBack).useValue({ bookBack: async () => 0 })
    .overrideProvider(SubscriptionAlertsService).useValue({ evaluateStudents: async () => 0 })
    .overrideProvider(AuditService).useValue({ record: async () => undefined })
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .overrideProvider(NotificationPolicy).useValue(policy)
    .overrideProvider(PushService).useValue(m.push)
    .overrideProvider(ScheduleNoticesRepo).useValue(m.notices)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const post = (url: string, token: string, body: object = {}) =>
    app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { app, post, m, reset: () => resetPauseMocks(m) };
}
