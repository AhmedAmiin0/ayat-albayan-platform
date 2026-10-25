import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflictChecker } from '../scheduling/conflict-checker';
import { conflict } from '../../common/http/errors';
import type { TeachersQueries } from '../teachers/teachers.queries';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, OTHER_TEACHER_ID, RULE_ID, STUDENT_ID, TEACHER_ID } from './lessons.fakes';
import type { LessonRow } from './lesson-row';
import { RescheduleOneService } from './reschedule-one.service';

const teachers = { get: vi.fn() };
const checker = { check: vi.fn() };
const NEW_START = '2026-10-05T17:00:00+03:00'; // Monday 17:00 Riyadh = 14:00Z
const CLASH = { kind: 'teacher_busy', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z', lessonId: 'x' };

function setup(row: LessonRow = lessonRow()) {
  const deps = fakeStore(row);
  const service = new RescheduleOneService(deps.store, teachers as unknown as TeachersQueries, checker as unknown as ConflictChecker);
  return { ...deps, service };
}
const one = (over: object = {}) => ({ scope: 'one' as const, startsAt: NEW_START, ...over });

describe('RescheduleOneService — move one occurrence (R-SCH-07, docs/10 route 8)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checker.check.mockResolvedValue([]);
  });

  it('old → rescheduled (not chargeable); new row on the same rule, linked, same duration and link', async () => {
    const { service, writer, record } = setup();
    const id = await service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN });
    const change = appliedChange(writer);
    expect(change?.changes).toEqual([{ id: LESSON_ID, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }]);
    expect(change?.lessons).toEqual([
      {
        id,
        rule_id: RULE_ID,
        teacher_id: TEACHER_ID,
        starts_at: '2026-10-05T14:00:00.000Z',
        ends_at: '2026-10-05T14:45:00.000Z',
        meeting_link: 'https://meet.jit.si/abrar',
        override_reason: null,
        rescheduled_from_id: LESSON_ID,
        student_ids: [STUDENT_ID],
      },
    ]);
    expect(change?.messages[0]).toMatchObject({ lesson_id: id, template_key: 'booking_confirmation', dedup_key: expect.stringContaining(id) });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'lessons', action: 'reschedule' }));
  });

  it('a platform teacher (meetingLinkAuto, the academy default included): the confirmation is plain while the new row keeps the fixed link', async () => {
    const { service, writer, queries } = setup();
    queries.meetingLinkAuto.mockResolvedValue(true);
    await service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN });
    const change = appliedChange(writer);
    expect(change?.lessons[0]?.meeting_link).toBe('https://meet.jit.si/abrar');
    expect(change?.messages[0]).toMatchObject({ template_key: 'booking_confirmation_plain' });
    expect(change?.messages[0]?.template_params).not.toHaveProperty('button');
  });

  it('checks conflicts without the lesson being moved', async () => {
    const { service } = setup();
    await service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN });
    expect(checker.check).toHaveBeenCalledWith({
      teacherId: TEACHER_ID,
      studentIds: [STUDENT_ID],
      proposed: [{ starts_at: new Date('2026-10-05T14:00:00Z'), ends_at: new Date('2026-10-05T14:45:00Z') }],
      excludeIds: [LESSON_ID],
    });
  });

  it('a clash blocks with 409 conflict + the list; with an override reason it books and stores the reason', async () => {
    checker.check.mockResolvedValue([CLASH]);
    const blocked = setup();
    await expect(blocked.service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN })).rejects.toMatchObject({
      status: 409,
      response: { code: 'conflict', message: 'conflict', conflicts: [CLASH] },
    });
    expect(blocked.writer.apply).not.toHaveBeenCalled();
    const forced = setup();
    await forced.service.reschedule({ lessonId: LESSON_ID, body: one({ override: { reason: 'طلب ولي الأمر' } }), actor: ADMIN });
    expect(appliedChange(forced.writer)?.lessons[0]?.override_reason).toBe('طلب ولي الأمر');
  });

  it('an override without a clash stores no reason', async () => {
    const { service, writer } = setup();
    await service.reschedule({ lessonId: LESSON_ID, body: one({ override: { reason: 'x' } }), actor: ADMIN });
    expect(appliedChange(writer)?.lessons[0]?.override_reason).toBeNull();
  });

  it("a substitute teacher brings their own link; an unknown one is 404", async () => {
    teachers.get.mockResolvedValueOnce({ id: OTHER_TEACHER_ID, meeting_link: 'https://meet.google.com/sub-code-xyz' });
    const { service, writer } = setup();
    await service.reschedule({ lessonId: LESSON_ID, body: one({ teacherId: OTHER_TEACHER_ID }), actor: ADMIN });
    expect(appliedChange(writer)?.lessons[0]).toMatchObject({ teacher_id: OTHER_TEACHER_ID, meeting_link: 'https://meet.google.com/sub-code-xyz' });
    expect(appliedChange(writer)?.messages[0]?.template_key).toBe('booking_confirmation_meet');
    teachers.get.mockResolvedValueOnce(null);
    await expect(service.reschedule({ lessonId: LESSON_ID, body: one({ teacherId: OTHER_TEACHER_ID }), actor: ADMIN })).rejects.toMatchObject({ status: 404 });
  });

  it('a closed lesson → 409 invalid_transition; a taken slot → 409 slot_taken', async () => {
    const closed = setup(lessonRow({ status: 'cancelled_by_teacher' }));
    await expect(closed.service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition', event: 'reschedule' },
    });
    const taken = setup();
    taken.writer.apply.mockRejectedValue(conflict('slot_taken'));
    await expect(taken.service.reschedule({ lessonId: LESSON_ID, body: one(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'slot_taken' },
    });
  });
});
