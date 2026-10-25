// HTTP test harness for the classroom routes (test-only, excluded from the build). Real controllers,
// guards, services and token minting; the DB-facing queries, the registry and the Outbox are mocks.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { Outbox } from '../inbox/outbox';
import { TeachersQueries } from '../teachers/teachers.queries';
import { TemplateRegistry } from '../whatsapp/templates/catalog/template.registry';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';
import { CLASSROOM_CONFIG, CLASSROOM_WEB_ORIGIN, RECORDING_CONFIG } from './classroom.config';
import { ADMIN, ASSISTANT, CONFIG, GUARDIAN, OTHER_TEACHER, queries, SALES, TEACHER, TEACHER_ID } from './classroom.fakes';
import { ClassroomQueries } from './classroom.queries';
import { meetingQueries } from './internal-meetings/internal-meetings.fakes';
import { meetingInviteMocks, overrideMeetingInvites, resetMeetingInvites } from './meetings/invites/meeting-invites.fakes';
import { InternalMeetingsQueries } from './internal-meetings/internal-meetings.queries';
import { LIVEKIT_HTTP } from './livekit/livekit-api';
import { registerLivekitWebhookParser } from './livekit/livekit-webhook.controller';
import { http, moderation, recordingQueries, S3 } from './moderation.fakes';
import { ModerationQueries } from './moderation.queries';
import { RecordingQueries } from './recording.queries';
import { studentLinkQueries } from './student-link/student-link.fakes';
import { StudentLinkQueries } from './student-link/student-link.queries';
import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../../common/audit/audit.service';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER, assistant: ASSISTANT, sales: SALES, guardian: GUARDIAN };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export type Call = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  token?: keyof typeof USERS | null;
  body?: object | string;
  ip?: string;
  headers?: Record<string, string>;
};

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
    moderation: moderation(),
    recordings: recordingQueries(),
    http: http(),
    storage: { signedDownload: vi.fn() },
    studentLinks: studentLinkQueries(),
    audit: { record: vi.fn() },
    meetings: meetingQueries(),
    invites: meetingInviteMocks(),
  };
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ClassroomQueries).useValue(m.queries)
    .overrideProvider(AssistantsQueries).useValue(m.assistants)
    .overrideProvider(AssistantLessonsQueries).useValue(m.assistantLessons)
    .overrideProvider(TeachersQueries).useValue(m.teachers)
    .overrideProvider(TemplateRegistry).useValue(m.templates)
    .overrideProvider(Outbox).useValue(m.outbox)
    .overrideProvider(CLASSROOM_CONFIG).useValue(config)
    .overrideProvider(CLASSROOM_WEB_ORIGIN).useValue('https://app.example.test')
    .overrideProvider(ModerationQueries).useValue(m.moderation)
    .overrideProvider(RecordingQueries).useValue(m.recordings)
    .overrideProvider(LIVEKIT_HTTP).useValue((...a: Parameters<typeof m.http>) => m.http(...a))
    .overrideProvider(RECORDING_CONFIG).useValue(S3)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(StudentLinkQueries).useValue(m.studentLinks)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(InternalMeetingsQueries).useValue(m.meetings)
    .overrideProvider(SettingsService).useValue(fakeSettings());
  const mod = await overrideMeetingInvites(builder, m.invites).compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
  registerLivekitWebhookParser(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body, ip, headers = {} }: Call) =>
    app.inject({
      method,
      url,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      payload: body,
      ...(ip ? { remoteAddress: ip } : {}),
    });
  const reset = () => {
    vi.resetAllMocks();
    Object.assign(m.queries, queries());
    Object.assign(m.moderation, moderation());
    Object.assign(m.recordings, recordingQueries());
    Object.assign(m.studentLinks, studentLinkQueries());
    Object.assign(m.meetings, meetingQueries());
    resetMeetingInvites(m.invites);
    m.http.mockImplementation(http({ body: { egress_id: 'EG_new' } }));
    m.storage.signedDownload.mockResolvedValue({ url: 'https://signed.example.test/r.mp4', expires_at: '' });
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
