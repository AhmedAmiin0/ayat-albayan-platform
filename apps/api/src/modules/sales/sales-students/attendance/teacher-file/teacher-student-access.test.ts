import { describe, expect, it, vi } from 'vitest';
import type { TeacherMeRepo } from '@/modules/teaching/lessons';
import type { StudentAttendanceRepo } from '@/modules/sales/sales-students/attendance/student-attendance.repo';
import { TeacherStudentAccess } from './teacher-student-access';

const NOW = new Date('2026-10-28T10:00:00Z');
const ME = { id: 'tr1', tz: 'Africa/Cairo', students: [{ id: 's-mine' }] };

function rig(me: typeof ME | null, taught = false) {
  const teachers = { me: vi.fn(async () => me) };
  const repo = { taughtBy: vi.fn(async () => taught) };
  const access = new TeacherStudentAccess(
    teachers as unknown as TeacherMeRepo,
    repo as unknown as StudentAttendanceRepo,
  );
  return { access, repo, teachers };
}

describe('TeacherStudentAccess (docs/47 guard)', () => {
  it('her student (isHers) passes with no repo read; returns her row id and zone', async () => {
    const r = rig(ME);
    expect(await r.access.owner('p1', 's-mine', NOW)).toEqual({ id: 'tr1', tz: 'Africa/Cairo' });
    expect(r.teachers.me).toHaveBeenCalledWith('p1');
    expect(r.repo.taughtBy).not.toHaveBeenCalled();
  });

  it('a student she taught in the last 90 days passes', async () => {
    const r = rig(ME, true);
    expect(await r.access.owner('p1', 's-taught', NOW)).toEqual({ id: 'tr1', tz: 'Africa/Cairo' });
    const since = new Date('2026-07-30T10:00:00Z');
    expect(r.repo.taughtBy).toHaveBeenCalledWith({ teacherId: 'tr1', studentId: 's-taught', since });
  });

  it('neither → 404 student_not_found; no teachers row → 404 teacher_not_linked', async () => {
    await expect(rig(ME).access.owner('p1', 's-other', NOW))
      .rejects.toMatchObject({ status: 404, response: { code: 'student_not_found' } });
    const unlinked = rig(null);
    await expect(unlinked.access.owner('p1', 's-mine', NOW))
      .rejects.toMatchObject({ status: 404, response: { code: 'teacher_not_linked' } });
    expect(unlinked.repo.taughtBy).not.toHaveBeenCalled();
  });
});
