// Test fixtures for classroom moderation and recordings (not shipped; excluded from the build).
import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import type { ClassroomConfig, RecordingConfig } from '@/modules/teaching/classroom/classroom.config';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { CONFIG, LESSON_ID, OTHER_TEACHER, TEACHER, TEACHER_ID, type queries } from '@/modules/teaching/classroom/classroom.fakes';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { signJwt } from '@/modules/teaching/classroom/livekit/livekit-token';
import type { FetchLike } from '@/common/infra/http/failure';
import { twirpAnswer } from '@/modules/teaching/classroom/livekit/livekit.fakes';
import type { ModerationRepo, ParticipantRow } from './moderation.repo';
import type { RecordingRow } from '@/modules/teaching/classroom/recordings/recording.repo';
import type { RecordingStarter } from '@/modules/teaching/classroom/recordings/recording.starter';
import { RoomAdmission } from '@/modules/teaching/classroom/join/room-admission';

export const S3: NonNullable<RecordingConfig> = {
  endpoint: 'https://project.storage.example.test/storage/v1/s3',
  region: 'eu-central-1',
  bucket: 'recordings',
  accessKey: 'access',
  secret: 'secret',
};

export const participantRow = (over: Partial<ParticipantRow> = {}): ParticipantRow => ({
  id: '00000000-0000-4000-8000-0000000000e1',
  lesson_id: LESSON_ID,
  identity: 'guest-0123456789ab',
  role: 'guest',
  user_id: null,
  join_link_id: '00000000-0000-4000-8000-0000000000f1',
  name: 'سهيلة',
  joined_at: '2026-10-05T16:01:00.000Z',
  ...over,
});

export const recordingRow = (over: Partial<RecordingRow> = {}): RecordingRow => ({
  id: '00000000-0000-4000-8000-0000000000aa',
  lesson_id: LESSON_ID,
  meeting_id: null,
  egress_id: 'EG_abc',
  status: 'done',
  file_path: `lessons/${LESSON_ID}/2026-10-05T16-00-00-000Z.mp4`,
  started_at: '2026-10-05T16:00:00.000Z',
  ended_at: '2026-10-05T17:00:00.000Z',
  error: null,
  size_bytes: null,
  visible_to_student: false,
  deleted_at: null,
  ...over,
});

/** Mocked ModerationQueries: nobody blocked, the guest participant found. */
export function moderation() {
  return {
    addParticipant: vi.fn().mockResolvedValue(undefined),
    participant: vi.fn().mockResolvedValue(participantRow()),
    isBlocked: vi.fn().mockResolvedValue(false),
    isTrialLesson: vi.fn().mockResolvedValue(false),
    block: vi.fn().mockResolvedValue(undefined),
  };
}

/** Mocked RecordingQueries: the claim succeeds. */
export function recordingQueries() {
  return {
    claim: vi.fn().mockResolvedValue('00000000-0000-4000-8000-0000000000aa'),
    attachEgress: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue(undefined),
    finishByEgress: vi.fn().mockResolvedValue(undefined),
    forTarget: vi.fn().mockResolvedValue([recordingRow()]),
    runningEgress: vi.fn().mockResolvedValue('EG_abc'),
  };
}

export const recorder = () => ({ startFor: vi.fn().mockResolvedValue('started'), configured: true });

/** A stub LiveKit transport answering `status` with `body` (JSON), recording every call. */
export function http(answer: { status?: number; body?: object } = {}) {
  return vi.fn<FetchLike>(async () => twirpAnswer(answer.status ?? 200, answer.body));
}

const teachersFake = () => ({
  idByProfile: vi.fn(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other' : null)),
});

interface JoinDeps {
  q: ReturnType<typeof queries>;
  mod?: ReturnType<typeof moderation>;
  rec?: ReturnType<typeof recorder>;
  teachers?: { idByProfile: ReturnType<typeof vi.fn> };
  config?: ClassroomConfig;
}

/** Real LessonRoleService over the mocked queries. */
export const rolesOf = (d: JoinDeps): LessonRoleService =>
  new LessonRoleService(d.q as unknown as ClassroomRepo, (d.teachers ?? teachersFake()) as unknown as TeachersRepo);

/** Real RoomAdmission over the mocked moderation queries and recorder. */
export const admissionOf = (d: JoinDeps): RoomAdmission =>
  new RoomAdmission(
    d.config === undefined ? CONFIG : d.config,
    (d.mod ?? moderation()) as unknown as ModerationRepo,
    (d.rec ?? recorder()) as unknown as RecordingStarter,
  );

/** The Authorization header LiveKit sends with a webhook body (bare JWT, sha256 claim of the body). */
export function signedWebhook(body: Buffer, opts: { now: Date; over?: object; secret?: string }): string {
  const nowS = Math.floor(opts.now.getTime() / 1000);
  const sha256 = createHash('sha256').update(body).digest('base64');
  return signJwt(opts.secret ?? CONFIG.apiSecret, { iss: CONFIG.apiKey, nbf: nowS - 5, exp: nowS + 300, sha256, ...opts.over });
}
