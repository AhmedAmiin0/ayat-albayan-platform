// Test fixtures and HTTP harness for the sales assistant side (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../../common/auth/auth.guard';
import type { AuthUser } from '../../../../common/auth/verify-token';
import type { SalesLiveRow, SalesStudentRow, SalesTeacherRow } from './sales-academy.queries';
import { SalesAcademyQueries } from './sales-academy.queries';
import { type RosterBalanceRow, type RosterLessonRow, type RosterPackageRow, type RosterRuleRow, SalesRosterRepo } from './sales-roster.repo';
import type { HistoryBundle } from '../history/sales-history.queries';
import { SalesHistoryQueries } from '../history/sales-history.queries';
import type { SalesScheduleRow } from '../schedule/sales-schedule.queries';
import { SalesScheduleQueries } from '../schedule/sales-schedule.queries';
import { SalesQueries } from '../sales.queries';
import { A, B, NONE, OWN_A } from '../sales.fakes';
import { fakeSettings } from '../../../../common/settings/settings.fakes';
import { SettingsService } from '../../../../common/settings/settings.service';

export const SUB = 'c1000000-0000-4000-8000-0000000000c1';
export const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: B, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  assistant: { id: 'as000000-0000-4000-8000-0000000000a5', email: null, role: 'assistant' },
  guardian: { id: 'g1', email: null, role: 'guardian' },
};
export const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

/** Rows as the database could return them, with secret columns present, so a test proves they never leave. */
export const teacherRow = (): SalesTeacherRow =>
  ({
    id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar', gender: 'female', programs: ['quran'],
    rate_60: 99, phone_e164: '+201001234567', meeting_link: 'https://meet.example.org/abrar', meeting_mode: null, notes: 'سر',
    students: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', notes: 'سر' }, { id: 's2', code: 'AB-0102', name: 'قديم', status: 'churned', program: 'quran' }],
  }) as SalesTeacherRow;

export const studentRow = (): SalesStudentRow =>
  ({
    id: 's1', code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', notes: 'سر', meeting_link_override: 'https://x/secret',
    package_remaining: 3, guardian: { name: 'أم ياسمين', phone_e164: '+966551110000' }, teacher: { display_name_ar: 'أبرار' },
  }) as SalesStudentRow;

export const liveRow = (): SalesLiveRow =>
  ({
    id: 'les-1', starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z', status: 'confirmed', meeting_link: 'https://meet/secret',
    teacher: { display_name_ar: 'أبرار' }, lesson_students: [{ student: { name: 'ياسمين' } }, { student: null }],
  }) as SalesLiveRow;

export const scheduleRow = (over: Partial<SalesScheduleRow> = {}): SalesScheduleRow =>
  ({
    id: 'les-2', starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z', status: 'confirmed', makeup_of_id: null,
    meeting_link: ' https://meet.example.org/les-2 ', cancel_reason: 'سر', rule: { package: 'trial', price: 99 },
    teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar', phone_e164: '+201001234567' },
    lesson_students: [{ student: { id: 's1', code: 'AB-0101', name: 'ياسمين', notes: 'سر' } }, { student: null }],
    ...over,
  }) as SalesScheduleRow;

export const bundle = (): HistoryBundle =>
  ({
    student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
    subscriptions: [
      { id: 'old', package: '8', status: 'expired', starts_on: '2026-08-01', renews_on: null, lessons_total: 8, created_at: '2026-08-01T10:00:00Z', price: 290 },
      { id: SUB, package: '8', status: 'active', starts_on: '2026-09-01', renews_on: '2026-10-01', lessons_total: 8, created_at: '2026-09-01T10:00:00Z', currency: 'SAR' },
    ],
    balances: [{ subscription_id: 'old', lessons_used: 8, remaining: 0, ended_at: '2026-08-30T16:30:00Z' }, { subscription_id: SUB, lessons_used: 3, remaining: 5, ended_at: null }],
    payments: [{ id: 'p1', subscription_id: SUB, paid_at: '2026-09-02T09:00:00Z', kind: 'payment', amount: 290, currency: 'SAR', method: 'bank', note: 'سر' }],
    audit: [
      { entity_id: SUB, at: '2026-09-01T10:00:00Z', before_status: null, after_status: 'unpaid' },
      { entity_id: SUB, at: '2026-09-01T11:00:00Z', before_status: 'unpaid', after_status: 'unpaid' },
      { entity_id: SUB, at: '2026-09-02T09:00:00Z', before_status: 'unpaid', after_status: 'active' },
    ],
  }) as unknown as HistoryBundle;

export async function academyApp() {
  const sales = { ownership: vi.fn(async (id: string) => (id === A ? OWN_A : NONE)), subscriptions: vi.fn(), meetings: vi.fn(), ownsLesson: vi.fn() };
  const academy = { teachers: vi.fn(async () => [teacherRow()]), students: vi.fn(async () => ({ rows: [studentRow()], total: 41 })), live: vi.fn(async () => [liveRow()]) };
  const schedule = { day: vi.fn(async () => [scheduleRow()]), upcoming: vi.fn(async () => [{ starts_at: '2026-10-12T15:00:00.000Z', lesson_students: [{ student_id: 's1' }] }]) };
  const history = { studentOf: vi.fn(async (id: string) => (id === SUB ? 's1' : null)), history: vi.fn(async () => bundle()) };
  const roster = {
    rules: vi.fn(async (): Promise<RosterRuleRow[]> => []),
    packages: vi.fn(async (): Promise<RosterPackageRow[]> => []),
    lessons: vi.fn(async (): Promise<RosterLessonRow[]> => []),
    balances: vi.fn(async (): Promise<RosterBalanceRow[]> => []),
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SalesQueries).useValue(sales)
    .overrideProvider(SalesAcademyQueries).useValue(academy)
    .overrideProvider(SalesRosterRepo).useValue(roster)
    .overrideProvider(SalesHistoryQueries).useValue(history)
    .overrideProvider(SalesScheduleQueries).useValue(schedule)
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string, token: keyof typeof USERS) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  return { app, get, sales, academy, history, schedule, roster };
}
