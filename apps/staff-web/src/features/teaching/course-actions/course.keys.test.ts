import { courseActionsKey } from '@ab/client-core';
import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { courseKeys } from './course.keys';

const REF = { studentId: 's1', subscriptionId: 'sub1' };

describe('course keys', () => {
  it('keeps the key shapes the course screens already cache under', () => {
    expect(courseKeys.stopPreview(REF)).toEqual(['course-actions', 's1', 'stop', 'sub1']);
    expect(courseKeys.move(REF, 'times')).toEqual(['course-actions', 's1', 'times', 'sub1']);
    expect(courseKeys.teachers('s1')).toEqual(['course-actions', 's1', 'teachers']);
    expect(courseKeys.card('s1', 'admin')).toEqual(['course-actions', 's1', 'card', 'admin']);
    expect(courseKeys.extend(REF)).toEqual(['course-actions', 's1', 'card', 'extend', 'sub1']);
    expect(courseKeys.cardLesson('l1')).toEqual(['course-card-lesson', 'l1']);
  });

  it('refreshes every read of one student after a course action, and no other student', async () => {
    const mine = [
      courseKeys.teachers('s1'),
      courseKeys.card('s1', 'admin'),
      courseKeys.extend(REF),
    ];
    const theirs = courseKeys.teachers('s2');
    expect(await staleAfter([...mine, theirs], courseActionsKey('s1'))).toEqual(mine);
  });
});
