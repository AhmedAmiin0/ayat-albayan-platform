import { describe, expect, it } from 'vitest';
import { addedLessons, courseChanges, courseMove, type CourseTold } from './course-change.notice-plan';

// Who hears a course change (owner 2026-10-30: «notify both the teacher and the family»).

const SUN = { id: 'old-sun', starts_at: '2026-11-01T14:00:00Z' };
const TUE = { id: 'old-tue', starts_at: '2026-11-03T14:00:00Z' };
const NEW_SUN = { id: 'new-sun', starts_at: '2026-11-01T14:00:00.000Z' };
const NEW_WED = { id: 'new-wed', starts_at: '2026-11-04T14:00:00.000Z' };
const NEW_MON = { id: 'new-mon', starts_at: '2026-11-02T14:00:00.000Z' };

const told = (over: Partial<CourseTold> = {}): CourseTold => ({
  moved: [SUN, TUE],
  added: [NEW_MON, NEW_WED],
  actorId: 'pADMIN',
  studentIds: ['S1'],
  teacherChanged: false,
  ...over,
});

describe('courseMove: the first start that changed', () => {
  it('Sun + Tue → Mon + Wed: Sun → Mon (the earliest of each)', () => {
    expect(courseMove(told({ added: [NEW_WED, NEW_MON] }))).toEqual({ from: SUN, to: NEW_MON });
  });

  it('Sun + Tue → Sun + Wed: Tue → Wed, never «Sun → Sun» (the same instant, any ISO form)', () => {
    expect(courseMove(told({ added: [NEW_SUN, NEW_WED] }))).toEqual({ from: TUE, to: NEW_WED });
  });

  it('the same days and times (a new teacher only), or nothing moved: no move', () => {
    expect(courseMove(told({ added: [NEW_SUN, { ...NEW_WED, starts_at: TUE.starts_at }] }))).toBe(
      null,
    );
    expect(courseMove(told({ moved: [] }))).toBe(null);
  });
});

describe('courseChanges: what ScheduleNotices hears after the commit', () => {
  it('the same teacher: ONE lesson_rescheduled to the teacher and the family', () => {
    expect(courseChanges(told(), true)).toEqual([
      {
        kind: 'lesson_rescheduled',
        lessonId: 'new-mon',
        fromStartsAt: SUN.starts_at,
        actorId: 'pADMIN',
        familyNotice: true,
      },
    ]);
  });

  it('a new teacher: the family’s lesson_rescheduled, the old teacher’s lesson_cancelled', () => {
    const changes = courseChanges(told({ teacherChanged: true }), false);
    expect(changes.map((c) => [c.kind, c.audience, c.kind === 'lesson_cancelled' && c.lessonId])).toEqual([
      ['lesson_rescheduled', 'family', false],
      ['lesson_cancelled', 'teacher', 'old-sun'],
    ]);
    expect(changes[0]).toMatchObject({ familyNotice: false, lessonId: 'new-mon' });
  });

  it('a new teacher on the same times: the old teacher only (the family keeps the confirmation)', () => {
    const same = told({ teacherChanged: true, added: [{ ...NEW_SUN }, { ...TUE, id: 'new-tue' }] });
    expect(courseChanges(same, false)).toEqual([
      { kind: 'lesson_cancelled', lessonId: 'old-sun', actorId: 'pADMIN', audience: 'teacher' },
    ]);
  });

  it('nothing moved: nothing to tell', () => {
    expect(courseChanges(told({ moved: [], teacherChanged: true }), false)).toEqual([]);
  });
});

describe('addedLessons: the new rules’ lessons of the change_course payload', () => {
  it('every lesson of every new rule; none for a payload without them', () => {
    const payload = { new_rules: [{ id: 'r1', lessons: [NEW_MON] }, { lessons: [NEW_WED] }] };
    expect(addedLessons(payload)).toEqual([NEW_MON, NEW_WED]);
    expect(addedLessons({ actor: 'a1' })).toEqual([]);
  });
});
