import { DEFAULT_JOIN_WINDOW } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { STUDENT_LESSON } from '@/modules/teaching/classroom/student-link/student-link.fakes';
import { toStudentLinkView } from '@/modules/teaching/classroom/student-link/student-link.mapper';

const page = {
  name: '  سهيلة محمد',
  win: DEFAULT_JOIN_WINDOW,
  now: new Date(STUDENT_LESSON.starts_at),
};

describe('toStudentLinkView', () => {
  it('greets by first name and shows the lesson with its window', () => {
    const view = toStudentLinkView({ ...page, lesson: STUDENT_LESSON });
    expect(view.first_name).toBe('سهيلة');
    expect(view.lesson).toMatchObject({ id: STUDENT_LESSON.id, teacher_name: 'أبرار' });
    expect(view.lesson?.window.state).toBe('open');
  });

  it('answers a null lesson when nothing is booked ahead', () => {
    expect(toStudentLinkView({ ...page, lesson: null })).toEqual({
      first_name: 'سهيلة',
      lesson: null,
    });
  });

  it('refuses a lesson id that is not a uuid', () => {
    expect(() => toStudentLinkView({ ...page, lesson: { ...STUDENT_LESSON, id: 'x' } })).toThrow();
  });
});
