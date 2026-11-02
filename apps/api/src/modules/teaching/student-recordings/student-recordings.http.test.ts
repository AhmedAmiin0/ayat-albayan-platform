import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { StorageService } from '@/common/storage/storage.service';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { RecordingAdminRepo } from './recording-admin.repo';
import { ADMIN, ASSISTANT, GUARDIAN, joinRow, OTHER_TEACHER, recording, REC_ID, SALES, STUDENT, studentQueries, TEACHER, TEACHER_ID, teachersFake } from './student-recordings.fakes';
import { StudentRecordingRepo } from './student-recordings.repo';

const READ_ONLY: AuthUser = { ...ADMIN, id: 'read-only-admin' };
const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER_TEACHER, assistant: ASSISTANT, guardian: GUARDIAN, sales: SALES, readOnly: READ_ONLY };
/** A custom admin-base role that holds recordings.read and nothing else. */
const resolver: PermissionResolver = async (user) => (user.id === READ_ONLY.id ? ['recordings.read'] : systemResolver(user));
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

describe('student recordings routes', () => {
  const sq = studentQueries();
  const admin = { byId: vi.fn(), setVisible: vi.fn(), markDeleted: vi.fn(), attendeeCount: vi.fn() };
  const storage = { signedDownload: vi.fn(), remove: vi.fn() };
  const audit = { record: vi.fn() };
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'PATCH' | 'DELETE', url: string, opts: { token?: string; payload?: object } = {}) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` }, ...(opts.payload && { payload: opts.payload }) });
  const list = `/students/${STUDENT}/recordings`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
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
    sq.assists.mockImplementation(async ({ profileId }: { profileId: string }) => profileId === ASSISTANT.id);
    storage.signedDownload.mockResolvedValue({ url: 'https://signed.example.test/r.mp4', expires_at: '' });
    admin.byId.mockResolvedValue({ ...recording(), lessons: { teacher_id: TEACHER_ID } });
    admin.attendeeCount.mockResolvedValue(1);
    admin.markDeleted.mockResolvedValue(1);
  });

  it('GET lists a page; the signed link is the one-hour link and no raw path leaks', async () => {
    const res = await call('GET', `${list}?page=2&pageSize=5&from=2026-10-01`, { token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 1, page: 2, pageSize: 5, items: [{ id: REC_ID, status: 'done', url: 'https://signed.example.test/r.mp4' }] });
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'recordings', path: joinRow().file_path, seconds: 3600 });
    expect(res.body).not.toContain(joinRow().file_path);
    expect(sq.page).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ page: 2, pageSize: 5, from: '2026-10-01' }) }));
  });

  it('GET: other teacher, guardian and sales are 403; an assistant needs the recordings.read grant (not default)', async () => {
    for (const token of ['other', 'guardian', 'sales', 'assistant']) expect((await call('GET', list, { token })).statusCode).toBe(403);
    expect(sq.page).not.toHaveBeenCalled();
  });

  it('GET recorded-lesson-ids: the same access, plain ids, nothing signed', async () => {
    const url = `/students/${STUDENT}/recorded-lesson-ids`;
    const res = await call('GET', url, { token: 'teacher' });
    expect([res.statusCode, res.json()]).toEqual([200, ['les-1']]);
    expect(storage.signedDownload).not.toHaveBeenCalled();
    expect((await call('GET', url, { token: 'guardian' })).statusCode).toBe(403);
  });

  it('GET: 404 for an unknown student, 400 for a bad id or a bad filter', async () => {
    sq.student.mockResolvedValueOnce(null);
    expect((await call('GET', list)).json().code).toBe('student_not_found');
    expect((await call('GET', '/students/x/recordings')).statusCode).toBe(400);
    expect((await call('GET', `${list}?from=yesterday`)).statusCode).toBe(400);
  });

  it('PATCH visibility: the lesson’s teacher and an admin; another teacher, an assistant and a guardian are 403', async () => {
    const url = `/recordings/${REC_ID}/visibility`;
    const res = await call('PATCH', url, { token: 'teacher', payload: { visible: true } });
    expect([res.statusCode, res.json()]).toEqual([200, { id: REC_ID, visible_to_student: true }]);
    expect((await call('PATCH', url, { token: 'admin', payload: { visible: true } })).statusCode).toBe(200);
    expect((await call('PATCH', url, { token: 'other', payload: { visible: true } })).statusCode).toBe(403);
    expect((await call('PATCH', url, { token: 'assistant', payload: { visible: true } })).statusCode).toBe(403);
    expect((await call('PATCH', url, { token: 'guardian', payload: { visible: true } })).statusCode).toBe(403);
    expect((await call('PATCH', url, { token: 'admin', payload: { visible: 'yes' } })).statusCode).toBe(400);
    admin.attendeeCount.mockResolvedValue(3);
    expect((await call('PATCH', url, { token: 'admin', payload: { visible: true } })).json().code).toBe('recording_group_lesson');
  });

  it('a read-only admin-base role lists recordings but can neither show/hide nor delete one', async () => {
    expect((await call('GET', list, { token: 'readOnly' })).statusCode).toBe(200);
    const patch = await call('PATCH', `/recordings/${REC_ID}/visibility`, { token: 'readOnly', payload: { visible: true } });
    expect(patch.statusCode).toBe(403);
    expect((await call('DELETE', `/recordings/${REC_ID}`, { token: 'readOnly' })).statusCode).toBe(403);
    expect(admin.byId).not.toHaveBeenCalled(); // refused at the gate, before the service looked at the row
  });

  it('DELETE is admin only: 204 with an audit row; a teacher is 403 and nothing is removed', async () => {
    const url = `/recordings/${REC_ID}`;
    expect((await call('DELETE', url, { token: 'teacher' })).statusCode).toBe(403);
    expect(storage.remove).not.toHaveBeenCalled();
    expect((await call('DELETE', url)).statusCode).toBe(204);
    expect(storage.remove).toHaveBeenCalledWith({ bucket: 'recordings', path: recording().file_path });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', entityId: REC_ID }));
    admin.byId.mockResolvedValueOnce(null);
    expect((await call('DELETE', url)).json().code).toBe('recording_not_found');
  });
});
