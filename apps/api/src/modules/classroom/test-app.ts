// HTTP test harness for the classroom routes (test-only, excluded from the build). Real controllers,
// guards, services and token minting; the DB-facing queries, the registry and the Outbox are mocks.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { Outbox } from '../inbox/outbox';
import { TeachersQueries } from '../teachers/teachers.queries';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';
import { CLASSROOM_CONFIG, CLASSROOM_WEB_ORIGIN } from './classroom.config';
import { ADMIN, ASSISTANT, CONFIG, GUARDIAN, OTHER_TEACHER, queries, SALES, TEACHER, TEACHER_ID } from './classroom.fakes';
import { ClassroomQueries } from './classroom.queries';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER, assistant: ASSISTANT, sales: SALES, guardian: GUARDIAN };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Call = { method: 'GET' | 'POST' | 'DELETE'; url: string; token?: keyof typeof USERS | null; body?: object; ip?: string };

/** Boots AppModule with the mocks; `reset()` restores the happy-path defaults (call in beforeEach). */
export async function classroomApp(config: typeof CONFIG | null = CONFIG) {
  const m = {
    queries: queries(),
    assistants: {
      allAssistants: vi.fn(), forStudent: vi.fn(), studentExists: vi.fn(), isAssistant: vi.fn(),
      assign: vi.fn(), remove: vi.fn(), studentIdsOf: vi.fn(), lessonRefs: vi.fn(),
    },
    assistantLessons: { between: vi.fn() },
    teachers: { idByProfile: vi.fn() },
    templates: { approved: vi.fn() },
    outbox: { send: vi.fn() },
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ClassroomQueries).useValue(m.queries)
    .overrideProvider(AssistantsQueries).useValue(m.assistants)
    .overrideProvider(AssistantLessonsQueries).useValue(m.assistantLessons)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(TemplateRegistry).useValue(m.templates)
    .overrideProvider(Outbox).useValue(m.outbox)
    .overrideProvider(CLASSROOM_CONFIG).useValue(config)
    .overrideProvider(CLASSROOM_WEB_ORIGIN).useValue('https://app.example.test')
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
    Object.assign(m.queries, queries());
    m.teachers.idByProfile.mockImplementation(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other' : null));
    m.templates.approved.mockResolvedValue({ key: 'lesson_join_link', status: 'approved' });
    m.outbox.send.mockResolvedValue({ view: { status: 'queued' }, replayed: false });
    m.assistants.allAssistants.mockResolvedValue([{ profile_id: ASSISTANT.id, full_name: 'نور' }]);
    m.assistants.forStudent.mockResolvedValue([]);
    m.assistants.studentExists.mockResolvedValue(true);
    m.assistants.isAssistant.mockResolvedValue(true);
    m.assistants.studentIdsOf.mockResolvedValue([]);
    m.assistants.lessonRefs.mockResolvedValue([]);
    m.assistantLessons.between.mockResolvedValue([]);
  };
  return { ...m, app, call, reset };
}
