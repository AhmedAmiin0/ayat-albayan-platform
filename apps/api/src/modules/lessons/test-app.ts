// HTTP test harness for the lessons + scheduling controllers (test-only, excluded from the build).
// Real controllers, guards, services and LessonAccess; every DB-facing class is a mock.
import { SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { NotificationPolicy } from '../notification-rules/policy';
import { fakePolicy } from '../notification-rules/policy.fakes';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { LessonWriter } from '../scheduling/lesson-writer';
import { ruleRow } from '../scheduling/scheduling.fakes';
import { ScheduleQueries } from '../scheduling/schedule.queries';
import { AlertsQueries } from '../subscriptions/alerts/alerts.queries';
import { StudentTrialQueries } from '../subscriptions/trial/student-trial.queries';
import { UnpaidFlags } from '../subscriptions/alerts/unpaid-flags.service';
import { TeachersQueries } from '../teachers/teachers.queries';
import { LessonProposalQueries } from './proposals/lesson-proposals.queries';
import { LessonsQueries } from './lessons.queries';
import { OverviewQueries } from './overview/overview.queries';
import { ADMIN, CONTACT, lessonRow, TEACHER, TEACHER_ID } from './lessons.fakes';
import { TeacherMeQueries } from './teacher-me/teacher-me.queries';
import { TimeEditQueries } from './time-edit/time-edit.queries';

const USERS: Record<string, AuthUser> = {
  admin: ADMIN,
  teacher: TEACHER,
  unlinked: { id: 'p0000000-0000-4000-8000-000000000009', email: null, role: 'teacher' },
  guardian: { id: 'g0000000-0000-4000-8000-000000000003', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Token = keyof typeof USERS;
export type InjectArgs = { method: 'GET' | 'POST' | 'PATCH'; url: string; token?: Token; body?: object };

function mocks() {
  return {
    lessons: {
      get: vi.fn(), byIds: vi.fn(), window: vi.fn(), studentPage: vi.fn(), studentExists: vi.fn(),
      openOfRule: vi.fn(), contacts: vi.fn(), seq: vi.fn(), meetingLinkAuto: vi.fn(), academyAuto: vi.fn(),
    },
    writer: { apply: vi.fn(), generate: vi.fn(), retime: vi.fn() },
    teachers: { idByProfile: vi.fn(), get: vi.fn(), loads: vi.fn() },
    overview: { teachers: vi.fn(), slots: vi.fn(), timeOff: vi.fn(), carryOver: vi.fn() },
    audit: { record: vi.fn() },
    settings: { all: vi.fn() },
    time: { payoutStatus: vi.fn() },
    rules: { rule: vi.fn(), activeRuleIds: vi.fn() },
    checker: { check: vi.fn() },
    me: { me: vi.fn() },
    unpaid: { studentIds: vi.fn() },
    proposals: { create: vi.fn(), get: vi.fn(), decide: vi.fn(), pendingLessonIds: vi.fn() },
  };
}

/** Boots AppModule with the mocks; `reset()` restores the happy-path defaults (call in beforeEach). */
export async function lessonsApp() {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(LessonsQueries).useValue(m.lessons)
    .overrideProvider(LessonWriter).useValue(m.writer)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(ScheduleQueries).useValue(m.rules)
    .overrideProvider(ConflictChecker).useValue(m.checker)
    .overrideProvider(TeacherMeQueries).useValue(m.me)
    .overrideProvider(OverviewQueries).useValue(m.overview)
    .overrideProvider(TimeEditQueries).useValue(m.time)
    .overrideProvider(LessonProposalQueries).useValue(m.proposals)
    // The rules (legacy, no rows): no DB here.
    .overrideProvider(NotificationPolicy).useValue(fakePolicy())
    // LessonEvents → SubscriptionAlerts listener; no DB here (R-SUB-02 is tested in subscriptions/).
    .overrideProvider(AlertsQueries).useValue({ studentsOfLessons: async () => [] })
    // LessonEvents → StudentTrialStatus listener (tested in subscriptions/student-trial-status.test.ts).
    .overrideProvider(StudentTrialQueries).useValue({ studentsOfTrialLessons: async () => [], lessonsOf: async () => [] })
    .overrideProvider(UnpaidFlags).useValue(m.unpaid)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  const reset = () => {
    vi.resetAllMocks();
    m.lessons.get.mockResolvedValue(lessonRow());
    m.lessons.byIds.mockImplementation(async (ids: string[]) => ids.map((id) => lessonRow({ id })));
    m.lessons.window.mockResolvedValue([lessonRow()]);
    m.lessons.openOfRule.mockResolvedValue([]);
    m.lessons.contacts.mockResolvedValue([CONTACT]);
    m.lessons.meetingLinkAuto.mockResolvedValue(false);
    m.lessons.academyAuto.mockResolvedValue(false);
    m.lessons.seq.mockResolvedValue(new Map());
    m.teachers.idByProfile.mockImplementation(async (id: string) => (id === TEACHER.id ? TEACHER_ID : null));
    m.settings.all.mockResolvedValue({ ...SETTING_DEFAULTS });
    m.time.payoutStatus.mockResolvedValue(null);
    m.rules.rule.mockResolvedValue(ruleRow());
    m.checker.check.mockResolvedValue([]);
    m.proposals.decide.mockResolvedValue(true);
    m.proposals.pendingLessonIds.mockResolvedValue([]);
    m.unpaid.studentIds.mockResolvedValue(new Set());
    m.teachers.loads.mockResolvedValue(new Map());
    for (const read of Object.values(m.overview)) read.mockResolvedValue([]);
  };
  return { ...m, app, call, reset };
}
