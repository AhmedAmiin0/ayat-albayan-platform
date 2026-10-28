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
import type { TrialLessonRead } from '../../teaching/booking';
import { type AttendanceRow, type LessonFacts, SalesStudentQueries } from './details/sales-student.queries';
import { ruleRow, upcomingRow } from './sales-students.schedule.fakes';
import { resetAttendance } from './attendance/student-attendance.fakes';
import { StudentAttendanceQueries } from './attendance/student-attendance.queries';
import { LessonServices } from './lessons/sales-lesson-actions.service';
import { resetOverview } from './teachers/sales-teacher-overview.fakes';
import { SalesTeacherOverviewQueries } from './teachers/sales-teacher-overview.queries';

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
  id: MINE, code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', tz: 'Africa/Cairo', notes: 'سر', meeting_link_override: 'https://x/secret',
  teacher: { display_name_ar: 'أبرار', phone_e164: '+201001234567' },
  guardian: { phone_e164: '+966551110000', name: 'سر', email: 'secret@example.org' },
});

const pastLessons = (): AttendanceRow[] => [
  { id: 'l4', starts_at: '2026-10-20T15:00:00+00:00', status: 'scheduled', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l3', starts_at: '2026-10-18T15:00:00+00:00', status: 'cancelled_by_teacher', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l2', starts_at: '2026-10-15T15:00:00+00:00', status: 'completed', lesson_students: [{ student_id: OTHER, attendance: 'on_time' }, { student_id: MINE, attendance: 'absent' }] },
  { id: 'l1b', starts_at: '2026-10-13T15:00:00+00:00', status: 'rescheduled', lesson_students: [{ student_id: MINE, attendance: null }] },
  { id: 'l1', starts_at: '2026-10-11T15:00:00+00:00', status: 'completed', lesson_students: [{ student_id: MINE, attendance: 'on_time' }] },
];

/** A trial moved once by «موعد تجريبي جديد» (old date first, so a test proves the order), with a link that never leaves. */
const trialLesson = (id: string, over: Partial<NonNullable<TrialLessonRead['lesson']>>) => ({
  id, rule_id: 'rt', teacher_id: 'tc1', starts_at: '2026-09-01T15:00:00+00:00', ends_at: '2026-09-01T15:30:00+00:00', status: 'rescheduled' as const,
  created_at: '2026-08-30T10:00:00Z', created_by: A, rescheduled_from_id: null, instant: false, makeup_of_id: null, rule: { package: 'trial' as const },
  teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: null }, meeting_link: 'https://meet/secret', ...over,
});
export const trialRows = (): TrialLessonRead[] => [
  { student_id: MINE, attendance: null, chargeable: false, lesson: trialLesson('t0', {}) },
  { student_id: MINE, attendance: 'on_time', chargeable: false, lesson: trialLesson('t1', { starts_at: '2026-09-03T15:00:00+00:00', status: 'completed', rescheduled_from_id: 't0' }) },
];

export const lessonFacts = (over: Partial<LessonFacts> = {}): LessonFacts => ({
  id: LESSON, starts_at: '2026-11-01T15:00:00+00:00', ends_at: '2026-11-01T15:30:00+00:00', status: 'scheduled', lesson_students: [{ student_id: MINE }], ...over,
});

const reportRow = { id: REPORT, lesson_id: 'l1', teacher_id: 'tc1', attendance: 'on_time', grade_recitation: 'excellent', grade_memorization: null, grade_revision: null, grade_tajweed: null,
  grade_engagement: null, grade_commitment: null, grade_overall: 'excellent', status: 'submitted', version: 1, pdf_status: 'ready', sent_at: '2026-10-11T16:00:00Z', notes: 'سر',
};

export async function studentsApp() {
  const sales = { ownership: vi.fn(async (id: string) => (id === A ? OWN : NONE)), subscriptions: vi.fn(), meetings: vi.fn() };
  const schedule = { rules: vi.fn(), upcoming: vi.fn() };
  const queries = { student: vi.fn(), pastLessons: vi.fn(), lesson: vi.fn(), prices: vi.fn(), trialDates: { trialLessons: vi.fn() }, rules: schedule.rules, upcoming: schedule.upcoming };
  const history = { history: vi.fn(), studentOf: vi.fn() };
  const reports = { submitted: vi.fn(), lessons: vi.fn(), sequence: vi.fn() };
  const files = { studentPdfUrl: vi.fn() };
  const overview = { exists: vi.fn(), rules: vi.fn(), lessons: vi.fn() };
  const attendance = { exists: vi.fn(), lessons: vi.fn(), starts: vi.fn(), reports: vi.fn() };
  const lessons = { one: { reschedule: vi.fn() }, cancels: { cancel: vi.fn() }, status: { confirm: vi.fn() } };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SalesQueries).useValue(sales)
    .overrideProvider(SalesStudentQueries).useValue(queries)
    .overrideProvider(SalesHistoryQueries).useValue(history)
    .overrideProvider(ReportHistoryQueries).useValue(reports)
    .overrideProvider(ReportFilesService).useValue(files)
    .overrideProvider(LessonServices).useValue(lessons)
    .overrideProvider(SalesTeacherOverviewQueries).useValue(overview)
    .overrideProvider(StudentAttendanceQueries).useValue(attendance)
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
    queries.prices.mockResolvedValue([]);
    queries.trialDates.trialLessons.mockResolvedValue(trialRows());
    queries.lesson.mockImplementation(async (id: string) => (id === LESSON ? lessonFacts() : lessonFacts({ id, status: 'scheduled' })));
    history.history.mockResolvedValue({ ...bundle(), student: { id: MINE, code: 'AB-0101', name: 'ياسمين' } });
    reports.submitted.mockResolvedValue([reportRow]);
    reports.lessons.mockResolvedValue([{ id: 'l1', starts_at: '2026-10-11T15:00:00+00:00', teacher: { id: 'tc1', display_name_ar: 'أبرار' } }]);
    reports.sequence.mockResolvedValue(new Map([['l1', 12]]));
    files.studentPdfUrl.mockResolvedValue({ url: 'https://storage/signed', expires_at: '2026-10-27T16:00:00.000Z' });
    lessons.one.reschedule.mockResolvedValue('1e000000-0000-4000-8000-0000000000c2');
    lessons.cancels.cancel.mockResolvedValue([LESSON]);
    lessons.status.confirm.mockResolvedValue(LESSON);
    schedule.rules.mockResolvedValue([ruleRow()]);
    schedule.upcoming.mockResolvedValue([upcomingRow(MINE)]);
    resetOverview(overview);
    resetAttendance(attendance);
  };
  return { app, call, reset, sales, queries, history, reports, files, lessons, schedule, overview, attendance };
}
