// HTTP test harness for the feedback routes (test-only, excluded from the build). Real controllers,
// guards, services, mapper, token and rate limiter; the DB-facing queries, the registry and the
// Outbox are mocks.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { Outbox } from '../inbox/outbox';
import { TeachersQueries } from '../teachers/teachers.queries';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { FEEDBACK_CONFIG } from './feedback.config';
import { ADMIN, GUARDIAN, listRow, OTHER_TEACHER, SECRET, TEACHER, TEACHER_ID } from './feedback.fakes';
import { FeedbackQueries } from './feedback.queries';
import { FeedbackReadQueries } from './feedback.read.queries';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER, guardian: GUARDIAN };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Token = keyof typeof USERS;
export type Call = { method: 'GET' | 'POST'; url: string; token?: Token | null; body?: object; ip?: string };

function mocks() {
  return {
    queries: { requestContext: vi.fn(), find: vi.fn(), issue: vi.fn(), byTokenHash: vi.fn(), answer: vi.fn() },
    reads: { page: vi.fn(), mine: vi.fn(), averages: vi.fn(), students: vi.fn(), teachers: vi.fn() },
    teachers: { idByProfile: vi.fn() },
    templates: { approved: vi.fn() },
    outbox: { send: vi.fn() },
  };
}

/** Boots AppModule with the mocks; `reset()` restores the happy-path defaults (call in beforeEach). */
export async function feedbackApp(secret: string | null = SECRET) {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(FeedbackQueries).useValue(m.queries)
    .overrideProvider(FeedbackReadQueries).useValue(m.reads)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(TemplateRegistry).useValue(m.templates)
    .overrideProvider(Outbox).useValue(m.outbox)
    .overrideProvider(FEEDBACK_CONFIG).useValue({ secret })
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body, ip }: Call) =>
    app.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload: body,
      ...(ip ? { remoteAddress: ip } : {}),
    });
  const reset = () => {
    vi.resetAllMocks();
    m.templates.approved.mockResolvedValue({ key: 'lesson_feedback_request', status: 'approved' });
    m.teachers.idByProfile.mockImplementation(async (id: string) =>
      id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other-teacher' : null,
    );
    m.reads.page.mockResolvedValue({ rows: [listRow()], total: 1 });
    m.reads.mine.mockResolvedValue({ rows: [listRow()], total: 1 });
    m.reads.averages.mockResolvedValue([]);
    m.reads.students.mockResolvedValue([{ id: listRow().student_id, code: 'AB-0183', name: 'سهيلة' }]);
    m.reads.teachers.mockResolvedValue([{ id: TEACHER_ID, display_name_ar: 'أبرار' }]);
  };
  return { ...m, app, call, reset };
}
