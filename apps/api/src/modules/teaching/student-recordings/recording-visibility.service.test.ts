import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import type { TeachersQueries } from '../../people/teachers/teachers.queries';
import type { RecordingAdminQueries, RecordingWithTeacher } from './recording-admin.queries';
import { RecordingVisibilityService } from './recording-visibility.service';
import { ADMIN, ASSISTANT, OTHER_TEACHER, recording, REC_ID, TEACHER, TEACHER_ID, teachersFake } from './student-recordings.fakes';

const row = (over: Partial<RecordingWithTeacher> = {}): RecordingWithTeacher => ({ ...recording(), lessons: { teacher_id: TEACHER_ID }, ...over });
const q = { byId: vi.fn(), setVisible: vi.fn(), attendeeCount: vi.fn() };
const audit = { record: vi.fn() };
const service = () =>
  new RecordingVisibilityService(q as unknown as RecordingAdminQueries, teachersFake() as unknown as TeachersQueries, audit as unknown as AuditService);

beforeEach(() => {
  vi.resetAllMocks();
  q.byId.mockResolvedValue(row());
  q.attendeeCount.mockResolvedValue(1);
});

describe('visibility toggle ownership', () => {
  it('the lesson’s own teacher turns it on, with an audit row', async () => {
    expect(await service().setVisibility({ user: TEACHER, id: REC_ID, visible: true })).toEqual({ id: REC_ID, visible_to_student: true });
    expect(q.setVisible).toHaveBeenCalledWith(REC_ID, true);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: TEACHER.id, entity: 'lesson_recordings', action: 'visibility_change', after: { visible_to_student: true } }));
  });

  it('another teacher and an assistant are refused and nothing is written', async () => {
    await expect(service().setVisibility({ user: OTHER_TEACHER, id: REC_ID, visible: true })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service().setVisibility({ user: ASSISTANT, id: REC_ID, visible: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.setVisible).not.toHaveBeenCalled();
  });

  it('a teacher cannot toggle a meeting’s recording; an admin can toggle any', async () => {
    q.byId.mockResolvedValue(row({ lesson_id: null, meeting_id: 'M', lessons: null }));
    await expect(service().setVisibility({ user: TEACHER, id: REC_ID, visible: true })).rejects.toBeInstanceOf(ForbiddenException);
    await service().setVisibility({ user: ADMIN, id: REC_ID, visible: true });
    expect(q.setVisible).toHaveBeenCalledTimes(1);
  });

  it('setting the value it already has writes nothing (no audit noise)', async () => {
    await service().setVisibility({ user: ADMIN, id: REC_ID, visible: false });
    expect(q.setVisible).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404 for an unknown recording, 409 for a deleted one', async () => {
    q.byId.mockResolvedValueOnce(null);
    await expect(service().setVisibility({ user: ADMIN, id: REC_ID, visible: true })).rejects.toBeInstanceOf(NotFoundException);
    q.byId.mockResolvedValueOnce(row({ status: 'deleted', deleted_at: '2026-10-06T08:00:00.000Z' }));
    await expect(service().setVisibility({ user: ADMIN, id: REC_ID, visible: true })).rejects.toBeInstanceOf(ConflictException);
  });

  it('a group lesson’s recording cannot be shown (409 recording_group_lesson); hiding it is still allowed', async () => {
    q.attendeeCount.mockResolvedValue(2);
    await expect(service().setVisibility({ user: ADMIN, id: REC_ID, visible: true })).rejects.toMatchObject({ response: { code: 'recording_group_lesson' } });
    await expect(service().setVisibility({ user: TEACHER, id: REC_ID, visible: true })).rejects.toBeInstanceOf(ConflictException);
    expect(q.setVisible).not.toHaveBeenCalled();
    q.byId.mockResolvedValue(row({ visible_to_student: true }));
    await service().setVisibility({ user: ADMIN, id: REC_ID, visible: false });
    expect(q.setVisible).toHaveBeenCalledWith(REC_ID, false);
  });
});
