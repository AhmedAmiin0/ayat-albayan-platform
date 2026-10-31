import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonEvents, type ScheduleChange } from '@/common/events/lesson-events';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { TeacherAlert } from '@/modules/teaching/booking/teacher/teacher-alert.service';
import { fakeFamilyMove } from '@/modules/teaching/schedule-notices/schedule-notices.fakes';
import type { CourseTold } from './course-change.notice-plan';
import { CourseChangeNotices } from './course-change.notices';
import { CourseChangeWriter } from './course-change.writer';

// change_course and who hears it (owner 2026-10-30): the family's ONE message (FamilyMoveNotice),
// then ScheduleNotices and, for a new teacher, TeacherAlert. Nothing is sent: every sink is a fake.

const SUN = { id: 'old-sun', starts_at: '2026-11-01T14:00:00Z' };
const TUE = { id: 'old-tue', starts_at: '2026-11-03T14:00:00Z' };
const MON = { id: 'new-mon', starts_at: '2026-11-02T14:00:00.000Z' };
const WED = { id: 'new-wed', starts_at: '2026-11-04T14:00:00.000Z' };
const CONFIRM = { template_key: 'booking_confirmation', dedup_key: 'booking_confirmation:x:g1' };
const RESULT = { data: { rule_ids: ['r2'], ends_on: null } };

function setup(o: { usable: boolean; told?: Partial<CourseTold> }) {
  const { db, calls } = fakeDb({ 'rpc:change_course': [RESULT] });
  const events = new LessonEvents();
  const heard = vi.fn(async (_change: ScheduleChange) => undefined);
  events.onScheduleChange(heard);
  const changed = vi.spyOn(events, 'changed');
  const alert = { toTeachers: vi.fn(async () => undefined) };
  const teachers = alert as unknown as TeacherAlert;
  const notices = new CourseChangeNotices(fakeFamilyMove(o.usable).move, events, teachers);
  const writer = new CourseChangeWriter(db, events, fakePolicy(), notices);
  const told: CourseTold = {
    moved: [SUN, TUE],
    added: [MON, WED],
    actorId: 'pADMIN',
    studentIds: ['S1'],
    teacherChanged: false,
    ...o.told,
  };
  const payload = { actor: 'pADMIN', new_rules: [{ lessons: told.added }], messages: [CONFIRM] };
  const write = () => writer.apply({ payload, subscriptionId: 'sub1', told });
  const written = () => calls.find((c) => c.table === 'rpc:change_course')?.args[0];
  const kinds = () => heard.mock.calls.map(([c]) => [c.kind, c.audience]);
  return { write, written, heard, kinds, changed, alert, payload };
}

describe('CourseChangeWriter: the course change tells the teacher and the family', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-31T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('new times, lesson_rescheduled usable: no confirmation, ONE notice to both', async () => {
    const s = setup({ usable: true });
    await s.write();
    expect(s.written()).toEqual({ p: { ...s.payload, messages: [] } });
    expect(s.changed).toHaveBeenCalledWith(['old-sun', 'old-tue']);
    expect(s.heard.mock.calls).toEqual([
      [
        {
          kind: 'lesson_rescheduled',
          lessonId: 'new-mon',
          fromStartsAt: SUN.starts_at,
          actorId: 'pADMIN',
          familyNotice: true,
        },
      ],
    ]);
    expect(s.alert.toTeachers).not.toHaveBeenCalled();
  });

  it('not usable (row off / not approved): the confirmation stays, familyNotice false', async () => {
    const s = setup({ usable: false });
    await s.write();
    expect(s.written()).toEqual({ p: s.payload });
    expect(s.heard).toHaveBeenCalledWith(expect.objectContaining({ familyNotice: false }));
  });

  it('a new teacher: the family’s move, the old teacher’s cancel, the new one’s alert', async () => {
    const s = setup({ usable: true, told: { teacherChanged: true } });
    await s.write();
    expect(s.kinds()).toEqual([
      ['lesson_rescheduled', 'family'],
      ['lesson_cancelled', 'teacher'],
    ]);
    expect(s.heard).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'old-sun' }));
    expect(s.alert.toTeachers).toHaveBeenCalledWith({
      lessonIds: ['new-mon'],
      studentIds: ['S1'],
      kind: 'package',
    });
  });

  it('a new teacher on the same times: the confirmation stays, both teachers told', async () => {
    const same = { teacherChanged: true, added: [{ ...SUN, id: 'n1' }, { ...TUE, id: 'n2' }] };
    const s = setup({ usable: true, told: same });
    await s.write();
    expect(s.written()).toEqual({ p: s.payload });
    expect(s.kinds()).toEqual([['lesson_cancelled', 'teacher']]);
    expect(s.alert.toTeachers).toHaveBeenCalledWith(expect.objectContaining({ lessonIds: ['n1'] }));
  });
});
