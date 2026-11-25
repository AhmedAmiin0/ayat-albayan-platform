import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { StudentRecordingsModule } from './student-recordings.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { StorageService } from '@/common/storage/storage.service';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { RecordingAdminRepo } from './recording-admin.repo';
import { ADMIN, OTHER_TEACHER, recording, REC_ID, STUDENT, studentQueries, TEACHER, TEACHER_ID, teachersFake } from './student-recordings.fakes';
import { StudentRecordingRepo } from './student-recordings.repo';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

describe('student recordings routes with another teacher’s ids', () => {
  const sq = studentQueries();
  const admin = {
    byId: vi.fn(), setVisible: vi.fn(), markDeleted: vi.fn(), attendeeCount: vi.fn(),
  };
  const storage = { signedDownload: vi.fn(), remove: vi.fn() };
  const audit = { record: vi.fn() };
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'DELETE', url: string, token: string) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` } });
  const lessonIds = `/students/${STUDENT}/recorded-lesson-ids`;
  const remove = `/recordings/${REC_ID}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [messagingRoot(StudentRecordingsModule)],
    })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TeachersRepo).useValue(teachersFake())
      .overrideProvider(StudentRecordingRepo).useValue(sq)
      .overrideProvider(RecordingAdminRepo).useValue(admin)
      .overrideProvider(StorageService).useValue(storage)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(sq, studentQueries());
    admin.byId.mockResolvedValue({ ...recording(), lessons: { teacher_id: TEACHER_ID } });
    admin.markDeleted.mockResolvedValue(1);
  });

  it('recorded-lesson-ids of another teacher’s student is 403 and no lesson id is read', async () => {
    const res = await call('GET', lessonIds, 'other');
    expect(res.statusCode).toBe(403);
    expect(sq.doneLessonIds).not.toHaveBeenCalled();
    expect(res.body).not.toContain('les-1');
  });

  it('recorded-lesson-ids of an unknown student is 404 and no lesson id is read', async () => {
    sq.student.mockResolvedValueOnce(null);
    const res = await call('GET', lessonIds, 'other');
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(sq.doneLessonIds).not.toHaveBeenCalled();
  });

  it('a teacher who taught the student once reads only the ids of her own lessons', async () => {
    sq.taughtBy.mockResolvedValueOnce(true);
    expect((await call('GET', lessonIds, 'other')).statusCode).toBe(200);
    expect(sq.doneLessonIds).toHaveBeenCalledWith({ studentId: STUDENT, onlyTeacherId: 'teacher-2' });
  });

  it('deleting another teacher’s recording is 403 and nothing is erased or audited', async () => {
    expect((await call('DELETE', remove, 'other')).statusCode).toBe(403);
    expect(storage.remove).not.toHaveBeenCalled();
    expect(admin.markDeleted).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('deleting an unknown recording is 404 and nothing is erased', async () => {
    admin.byId.mockResolvedValueOnce(null);
    const res = await call('DELETE', remove, 'other');
    expect([res.statusCode, res.json().code]).toEqual([404, 'recording_not_found']);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('the student’s teacher still reads the ids and the admin still deletes', async () => {
    expect((await call('GET', lessonIds, 'teacher')).json()).toEqual(['les-1']);
    expect((await call('DELETE', remove, 'admin')).statusCode).toBe(204);
  });
});
