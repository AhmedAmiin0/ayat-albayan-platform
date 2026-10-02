import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../scheduling/scheduling.fakes';
import type { LessonAccess } from './lesson-access';
import { LessonStatusService } from './lesson-status.service';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, STUDENT_ID } from './lessons.fakes';

const SISTER = '00000000-0000-4000-8000-0000000000c2';
const STRANGER = '00000000-0000-4000-8000-0000000000c9';
const siblings = lessonRow({
  lesson_students: [
    { student_id: STUDENT_ID, attendance: null, chargeable: true, student: null },
    { student_id: SISTER, attendance: null, chargeable: true, student: null },
  ],
});
function setup() {
  const deps = fakeStore(siblings);
  const access = { assertCanTouch: vi.fn() } as unknown as LessonAccess;
  return { ...deps, service: new LessonStatusService(deps.store, access, fakeSettings(5, null)) };
}

describe('LessonStatusService.changeStatus — one outcome per sibling (R-STU-04, R-SCH-03)', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-04T15:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('completed for the lesson, absent for the sister only, in one change; audited per student', async () => {
    const { service, writer, record } = setup();
    const students = [{ studentId: SISTER, event: 'mark_no_show' as const }];
    await service.changeStatus({ lessonId: LESSON_ID, event: 'complete', students, actor: ADMIN });
    const [change] = appliedChange(writer)?.changes ?? [];
    expect(change).toMatchObject({ to_status: 'completed', attendance: 'on_time', chargeable: true });
    expect(change?.students).toEqual([{ student_id: SISTER, attendance: 'absent', chargeable: true }]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ after: expect.objectContaining({ students: change?.students }) }),
    );
  });

  it('a student who is not on the lesson → 400 student_not_in_lesson, nothing written', async () => {
    const { service, writer } = setup();
    const students = [{ studentId: STRANGER, event: 'excuse' as const }];
    await expect(
      service.changeStatus({ lessonId: LESSON_ID, event: 'complete', students, actor: ADMIN }),
    ).rejects.toMatchObject({ status: 400, response: { code: 'student_not_in_lesson' } });
    expect(writer.apply).not.toHaveBeenCalled();
  });
});
