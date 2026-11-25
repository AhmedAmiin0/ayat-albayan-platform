import { describe, expect, it } from 'vitest';
import { courseActionsKey } from '../course-actions';
import { coursePauseKey } from '../course-pause';
import { courseKeys, pauseKeys } from './index';

const REF = { studentId: 's1', subscriptionId: 'sub1' };

const under = (prefix: readonly unknown[]) => (key: readonly unknown[]) =>
  prefix.every((part, at) => key[at] === part);

describe('course keys', () => {
  it('keeps the key shapes the course screens already cache under', () => {
    expect(courseKeys.stopPreview(REF)).toEqual(['course-actions', 's1', 'stop', 'sub1']);
    expect(courseKeys.move(REF, 'times')).toEqual(['course-actions', 's1', 'times', 'sub1']);
    expect(courseKeys.current('s1', '/p')).toEqual(['course-actions', 's1', 'current', '/p']);
    expect(courseKeys.teachers('s1')).toEqual(['course-actions', 's1', 'teachers']);
    expect(courseKeys.card('s1', 'admin')).toEqual(['course-actions', 's1', 'card', 'admin']);
    expect(courseKeys.extend(REF)).toEqual(['course-actions', 's1', 'card', 'extend', 'sub1']);
    expect(courseKeys.cardLesson('l1')).toEqual(['course-card-lesson', 'l1']);
  });

  it('puts every read of one student under its actions key, and no other student', () => {
    const mine = [
      courseKeys.stopPreview(REF),
      courseKeys.current('s1', null),
      courseKeys.teachers('s1'),
      courseKeys.card('s1', 'sales'),
      courseKeys.extend(REF),
      pauseKeys.resume('s1'),
    ];
    const theirs = courseKeys.teachers('s2');
    expect([...mine, theirs].filter(under(courseActionsKey('s1')))).toEqual(mine);
  });

  it('keeps the card lesson out of every student key', () => {
    expect(under(courseActionsKey('s1'))(courseKeys.cardLesson('l1'))).toBe(false);
  });
});

describe('pause keys', () => {
  it('keeps the key shapes the pause screens already cache under', () => {
    const window = { studentId: 's1', from: '2026-12-01', until: null };
    expect(pauseKeys.preview(window)).toEqual([
      'course-pause',
      's1',
      'preview',
      '2026-12-01',
      null,
    ]);
    expect(pauseKeys.resume('s1')).toEqual(['course-actions', 's1', 'card', 'resume']);
  });

  it('puts the preview under the pause state, and not the resume preview', () => {
    const preview = pauseKeys.preview({ studentId: 's1', from: 'a', until: 'b' });
    const resume = pauseKeys.resume('s1');
    expect([preview, resume].filter(under(coursePauseKey('s1')))).toEqual([preview]);
  });
});
