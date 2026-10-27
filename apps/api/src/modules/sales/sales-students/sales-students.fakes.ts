// Test fixtures and HTTP harness for sales' «تفاصيل الطالب» and lesson actions (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '../../../common/auth/auth.guard';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { ReportFilesService, ReportHistoryQueries } from '../../reporting/reports';
import { SalesHistoryQueries, SalesQueries } from '../sales';
import { A, NONE, OWN_A } from '../sales/sales.fakes';
import { bundle, verify } from '../sales/academy/sales-academy.fakes';
import { type AttendanceRow, type LessonFacts, SalesStudentQueries } from './details/sales-student.queries';
import { LessonServices } from './lessons/sales-lesson-actions.service';

export { A };
// The routes take uuids: A owns MINE here (OWN_A with its student id swapped), never OTHER.
export const MINE = '51000000-0000-4000-8000-0000000000a1';
export const OTHER = '52000000-0000-4000-8000-0000000000b2';
export const LESSON = '1e000000-0000-4000-8000-0000000000c1';
export const REPORT = 'f0000000-0000-4000-8000-0000000000f1';
const OWN = { ...OWN_A, studentIds: [MINE] };

type Token = 'salesA' | 'salesB' | 'admin' | 'teacher' | 'assistant';

/** Rows as the database could return them, with secret columns present, so a test proves they never leave. */
const studentRow = () => ({
  id: MINE, code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', notes: 'سر', meeting_link_override: 'https://x/secret',
  teacher: { display_name_ar: 'أبرار', phone_e164: '+201001234567' },
});

const pastLessons = (): AttendanceRow[] => [
  { id: 'l4', starts_at: '2026-10-20T15:00:00+00:00', status: 'scheduled', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l3', starts_at: '2026-10-18T15:00:00+00:00', status: 'cancelled_by_teacher', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l2', starts_at: '2026-10-15T15:00:00+00:00', status: 'completed', lesson_students: [{ student_id: OTHER, attendance: 'on_time' }, { student_id: MINE, attendance: 'absent' }] },
  { id: 'l1b', starts_at: '2026-10-13T15:00:00+00:00', status: 'rescheduled', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l1', starts_at: '2026-10-11T15:00:00+00:00', status: 'completed', lesson_students: [{ student_id: MINE, attendance: 'on_time' }] },
];

export const lessonFacts = (over: Partial<LessonFacts> = {}): LessonFacts => ({
  id: LESSON, starts_at: '2026-11-01T15:00:00+00:00', ends_at: '2026-11-01T15:30:00+00:00', status: 'scheduled', lesson_students: [{ student_id: MINE }], ...over,
});

const reportRow = { id: REPORT, lesson_id: 'l1', teacher_id: 'tc1', attendance: 'on_time', grade_recitation: 'excellent', grade_memorization: null, grade_revision: null, grade_tajweed: null,
  grade_engagement: null, grade_commitment: null, grade_overall: 'excellent', status: 'submitted', version: 1, pdf_status: 'ready', sent_at: '2026-10-11T16:00:00Z', notes: 'سر',
};

export async function studentsApp() {
  const sales = { ownership: vi.fn(async (id: string) => (id === A ? OWN : NONE)), subscriptions: vi.fn(), meetings: vi.fn() };
  const queries = { student: vi.fn(), pastLessons: vi.fn(), lesson: vi.fn() };
  const history = { history: vi.fn(), studentOf: vi.fn() };
  const reports = { submitted: vi.fn(), lessons: vi.fn(), sequence: vi.fn() };
  const files = { studentPdfUrl: vi.fn() };
  const lessons = { one: { reschedule: vi.fn() }, cancels: { cancel: vi.fn() } };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SalesQueries).useValue(sales)
    .overrideProvider(SalesStudentQueries).useValue(queries)
    .overrideProvider(SalesHistoryQueries).useValue(history)
    .overrideProvider(ReportHistoryQueries).useValue(reports)
    .overrideProvider(ReportFilesService).useValue(files)
    .overrideProvider(LessonServices).useValue(lessons)
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (method: 'GET' | 'POST', url: string, opts: { token: Token; body?: object }) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${opts.token}` }, ...(opts.body ? { payload: opts.body } : {}) });
  const reset = () => {
    vi.clearAllMocks();
    queries.student.mockResolvedValue(studentRow());
    queries.pastLessons.mockResolvedValue(pastLessons());
    queries.lesson.mockImplementation(async (id: string) => (id === LESSON ? lessonFacts() : lessonFacts({ id, status: 'scheduled' })));
    history.history.mockResolvedValue({ ...bundle(), student: { id: MINE, code: 'AB-0101', name: 'ياسمين' } });
    reports.submitted.mockResolvedValue([reportRow]);
    reports.lessons.mockResolvedValue([{ id: 'l1', starts_at: '2026-10-11T15:00:00+00:00', teacher: { id: 'tc1', display_name_ar: 'أبرار' } }]);
    reports.sequence.mockResolvedValue(new Map([['l1', 12]]));
    files.studentPdfUrl.mockResolvedValue({ url: 'https://storage/signed', expires_at: '2026-10-27T16:00:00.000Z' });
    lessons.one.reschedule.mockResolvedValue('1e000000-0000-4000-8000-0000000000c2');
    lessons.cancels.cancel.mockResolvedValue([LESSON]);
  };
  return { app, call, reset, sales, queries, history, reports, files, lessons };
}
