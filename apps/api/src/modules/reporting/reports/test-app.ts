// HTTP test harness for the reports controllers (test-only, excluded from the build).
// Real controllers, guards, services and ReportAccess; every DB / storage facing class is a mock.
import { SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { LessonEvents } from '../../../common/events/lesson-events';
import { PushService } from '../../../common/push/push.service';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { StorageService } from '../../../common/storage/storage.service';
import { TeachersQueries } from '../../people/teachers/teachers.queries';
import { ReportAttachmentsQueries } from './files/report-attachments.queries';
import { ReportHistoryQueries } from './history/report-history.queries';
import { ReportLessonQueries } from './report-lesson.queries';
import { ReportPdfQueue } from './submit/report-pdf.queue';
import { ReportsQueries } from './reports.queries';
import { TeacherReportsQueries } from './teacher/teacher-reports.queries';
import { ADMIN, GUARDIAN, lessonRow, OTHER_TEACHER, reportRow, TEACHER, TEACHER_ID } from './reports.fakes';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER, guardian: GUARDIAN };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

type Token = keyof typeof USERS;
export type InjectArgs = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string; token?: Token; body?: object };

function mocks() {
  return {
    reports: {
      get: vi.fn(), byLesson: vi.fn(), lesson: vi.fn(), ensureDrafts: vi.fn(), alignUntouched: vi.fn(), updateDraft: vi.fn(),
      submit: vi.fn(), retryPdf: vi.fn(), requestPdf: vi.fn(),
    },
    lessons: { lessonNumbers: vi.fn(), packages: vi.fn(), memory: vi.fn() },
    history: { submitted: vi.fn(), lessons: vi.fn(), sequence: vi.fn(), student: vi.fn(), taught: vi.fn(), pending: vi.fn() },
    files: { add: vi.fn(), get: vi.fn(), remove: vi.fn(), pdfName: vi.fn() },
    storage: { signedUpload: vi.fn(), signedDownload: vi.fn(), exists: vi.fn(), remove: vi.fn(), upload: vi.fn() },
    teachers: { idByProfile: vi.fn() },
    mine: { page: vi.fn(), students: vi.fn() },
    settings: fakeSettings(),
    events: { changed: vi.fn(), onChanged: vi.fn(), onScheduleChange: vi.fn() },
    pdf: { enqueue: vi.fn() },
    push: { notifyAdmins: vi.fn() },
  };
}

/** Boots AppModule with the mocks; `reset()` restores the happy-path defaults (call in beforeEach). */
export async function reportsApp() {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ReportsQueries).useValue(m.reports)
    .overrideProvider(ReportLessonQueries).useValue(m.lessons)
    .overrideProvider(ReportHistoryQueries).useValue(m.history)
    .overrideProvider(TeacherReportsQueries).useValue(m.mine)
    .overrideProvider(ReportAttachmentsQueries).useValue(m.files)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(LessonEvents).useValue(m.events)
    .overrideProvider(ReportPdfQueue).useValue(m.pdf)
    .overrideProvider(PushService).useValue(m.push)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'teacher', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  const reset = () => {
    vi.resetAllMocks();
    m.reports.get.mockResolvedValue(reportRow());
    m.reports.byLesson.mockResolvedValue([reportRow()]);
    m.reports.lesson.mockResolvedValue(lessonRow());
    m.reports.updateDraft.mockImplementation(async () => reportRow());
    m.lessons.lessonNumbers.mockResolvedValue(new Map());
    m.lessons.packages.mockResolvedValue(new Map());
    m.lessons.memory.mockResolvedValue(new Map());
    m.teachers.idByProfile.mockImplementation(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other' : null));
    vi.mocked(m.settings.all).mockResolvedValue({ ...SETTING_DEFAULTS });
    m.history.submitted.mockResolvedValue([]);
    m.history.lessons.mockResolvedValue([]);
    m.history.sequence.mockResolvedValue(new Map());
    m.history.pending.mockResolvedValue([]);
    m.mine.page.mockResolvedValue({ rows: [], total: 0 });
    m.mine.students.mockResolvedValue([]);
  };
  return { ...m, app, call, reset };
}
