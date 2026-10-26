// Test fixtures and HTTP harness for the family portal (test-only, excluded from the build by *.fakes.ts).
import type { PortalStudent } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { StorageService } from '../../../common/storage/storage.service';
import { BalanceQueries } from '../../finance/subscriptions';
import { ClassroomQueries } from '../../teaching/classroom/classroom.queries';
import { ChatNumber } from './home/chat-number';
import type { PortalLessonRow } from './lessons/portal-lessons.queries';
import { PortalLessonsQueries } from './lessons/portal-lessons.queries';
import { PortalPackageQueries } from './package/portal-package.queries';
import { PortalReportsQueries } from './reports/portal-reports.queries';
import { PortalScopeQueries } from './scope/portal-scope.queries';

export const S1 = '51000000-0000-4000-8000-000000000001';
export const S2 = '51000000-0000-4000-8000-000000000002';
/** Another family's child. */
export const S3 = '51000000-0000-4000-8000-000000000003';
export const L1 = 'e1000000-0000-4000-8000-000000000001';
export const R1 = 'f1000000-0000-4000-8000-000000000001';
export const REC = 'fa000000-0000-4000-8000-000000000001';

const kid = (id: string, name: string): PortalStudent => ({ id, code: 'AB-0201', name, tz: 'Africa/Cairo', contact_is_self: false });
const FAMILIES: Record<string, PortalStudent[]> = {
  'g-a': [kid(S1, 'سلمى'), kid(S2, 'يوسف')],
  's-1': [kid(S1, 'سلمى')],
  'g-b': [kid(S3, 'مريم')],
};
const USERS: Record<string, AuthUser> = {
  guardianA: { id: 'g-a', email: null, role: 'guardian' },
  student1: { id: 's-1', email: null, role: 'student' },
  guardianB: { id: 'g-b', email: null, role: 'guardian' },
  admin: { id: 'ad', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  sales: { id: 'sa', email: null, role: 'sales' },
  assistant: { id: 'as', email: null, role: 'assistant' },
};
export type Who = keyof typeof USERS;
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

/** A lesson row with the secret columns a careless select would carry. */
export const lessonRow = (over: Partial<PortalLessonRow> = {}): PortalLessonRow =>
  ({
    id: L1, starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z', status: 'confirmed', room_opened_at: null,
    meeting_link: 'https://meet.example.org/abc', notes: 'سر', cancel_reason: 'سر',
    teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar', meeting_mode: 'static', phone_e164: '+201001234567', email: 'x@example.org' },
    lesson_students: [{ student_id: S1 }],
    ...over,
  }) as PortalLessonRow;

export async function portalApp() {
  const scope = { studentsOf: vi.fn(async (id: string) => FAMILIES[id] ?? []) };
  const lessons = {
    readSettings: vi.fn(async () => ({ meeting_link_auto: false, join_opens_before_min: 10, join_closes_after_min: 120 })),
    ahead: vi.fn(async () => [lessonRow()]), one: vi.fn(async (): Promise<PortalLessonRow | null> => lessonRow()), override: vi.fn(async (): Promise<string | null> => null) };
  const reports = {
    sent: vi.fn(async () => [{ id: R1, lesson_id: L1, sent_at: '2026-10-20T18:00:00.000Z', pdf_path: `${S1}/${L1}.pdf`, notes: 'سر', lesson: { starts_at: '2026-10-20T16:00:00.000Z', teacher: { display_name_ar: 'أبرار', display_name_en: null } } }]),
    oneSent: vi.fn(async (): Promise<{ id: string; lesson_id: string; sent_at: string; pdf_path: string } | null> => ({ id: R1, lesson_id: L1, sent_at: '2026-10-20T18:00:00.000Z', pdf_path: `${S1}/${L1}.pdf` })),
    visibleRecordings: vi.fn(async () => [{ id: REC, lesson_id: L1, file_path: `lessons/${L1}/a.mp4` }]),
  };
  const packages = { packages: vi.fn(async () => [{ id: 'p1', package: '8', duration: 30, lessons_total: 8, starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active', price: 290, currency: 'SAR', notes: 'سر' }]) };
  const balances = { forStudents: vi.fn(async () => [{ subscription_id: 'p1', remaining: 5 }]), forSubscriptions: vi.fn() };
  const classroom = {
    lesson: vi.fn(async () => ({ id: L1, teacher_id: 'tc', starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z', status: 'confirmed', room_opened_at: null })),
    joinWindow: vi.fn(async () => ({ opensBeforeMin: 10, closesAfterMin: 15 })),
    rotateStudentLink: vi.fn(async () => undefined),
  };
  const storage = { signedDownload: vi.fn(async (ref: { seconds?: number }) => ({ url: 'https://files.example.org/signed', expires_at: `+${ref.seconds}` })) };
  const chat = { e164: vi.fn(async (): Promise<string | null> => '+966500000000') };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(PortalScopeQueries).useValue(scope)
    .overrideProvider(PortalLessonsQueries).useValue(lessons)
    .overrideProvider(PortalReportsQueries).useValue(reports)
    .overrideProvider(PortalPackageQueries).useValue(packages)
    .overrideProvider(BalanceQueries).useValue(balances)
    .overrideProvider(ClassroomQueries).useValue(classroom)
    .overrideProvider(StorageService).useValue(storage)
    .overrideProvider(ChatNumber).useValue(chat)
    .overrideProvider(SettingsService).useValue(fakeSettings({ meeting_link_auto: false }))
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (method: 'GET' | 'POST', url: string, who?: Who) =>
    app.inject({ method, url, headers: who ? { authorization: `Bearer ${who}` } : {} });
  return { app, call, scope, lessons, reports, packages, balances, classroom, storage, chat };
}

/** Every key at any depth of a JSON value. */
export const keysOf = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keysOf(x)]) : [];
