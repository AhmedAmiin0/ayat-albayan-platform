import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/http/index.js';
import {
  courseMoveErrorCode,
  courseMoveViewPath,
  courseStopErrorCode,
  courseStopLessonsText,
  courseStopPath,
  courseStopPreviewPath,
  courseTeacherOptionsPath,
} from './course-actions.js';

const fail = (code: unknown) => new ApiError(409, { code });

describe('course actions paths (owner 2026-10-30)', () => {
  it('builds the profile routes', () => {
    expect(courseStopPath('s1')).toBe('/students/s1/course-stop');
    expect(courseStopPreviewPath({ studentId: 's1', subscriptionId: 'p 1' })).toBe('/students/s1/course-stop?subscriptionId=p%201');
    expect(courseMoveViewPath({ studentId: 's1', kind: 'teacher', subscriptionId: 'p1' })).toBe('/students/s1/course-teacher/change?subscriptionId=p1');
    expect(courseMoveViewPath({ studentId: 's1', kind: 'times', subscriptionId: 'p1' })).toBe('/students/s1/course-times/change?subscriptionId=p1');
    expect(courseTeacherOptionsPath('s1')).toBe('/students/s1/course-teacher/teachers');
  });
});

describe('the stop sheet line (MSA)', () => {
  const words = ar.courseActions.stop.lessons;
  it('zero, one, two, few and many lessons', () => {
    expect(courseStopLessonsText(words, { futureLessons: 0 })).toBe(words.zero);
    expect(courseStopLessonsText(words, { futureLessons: 1 })).toBe('ستُلغى حلقة قادمة واحدة');
    expect(courseStopLessonsText(words, { futureLessons: 2 })).toBe('ستُلغى حلقتان قادمتان');
    expect(courseStopLessonsText(words, { futureLessons: 5 })).toBe('ستُلغى 5 حلقات قادمة');
    expect(courseStopLessonsText(words, { futureLessons: 12 })).toBe('ستُلغى 12 حلقة قادمة');
  });
});

describe('error codes', () => {
  it('maps the stop codes, anything else is generic', () => {
    expect(courseStopErrorCode(fail('already_cancelled'))).toBe('already_cancelled');
    expect(courseStopErrorCode(fail('has_future_lessons'))).toBe('has_future_lessons');
    expect(courseStopErrorCode(fail('course_unattributed'))).toBe('course_unattributed');
    expect(courseStopErrorCode(fail('conflict'))).toBe('generic');
    expect(courseStopErrorCode(new Error('x'))).toBe('generic');
  });

  it('maps the change codes; every code has an Arabic message', () => {
    for (const code of ['conflict', 'same_teacher', 'course_finished', 'teacher_inactive', 'no_change'])
      expect(courseMoveErrorCode(fail(code))).toBe(code);
    expect(courseMoveErrorCode(fail(42))).toBe('generic');
    expect(courseMoveErrorCode(new ApiError(500, null))).toBe('generic');
    const errors: Record<string, string> = ar.courseActions.errors;
    for (const code of ['already_cancelled', 'teacher_not_found', 'course_exists', 'course_unattributed', 'generic'])
      expect(errors[code]).toBeTruthy();
    expect(courseMoveErrorCode(fail('course_unattributed'))).toBe('course_unattributed');
  });
});
