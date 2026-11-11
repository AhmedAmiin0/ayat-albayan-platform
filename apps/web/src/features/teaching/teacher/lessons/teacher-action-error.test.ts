import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { teacherActionError } from './teacher-action-error';

describe('teacherActionError', () => {
  it('409 lesson_started → «بدأت الحلقة»', () => {
    const e = new ApiError(409, { code: 'lesson_started', message: 'lesson_started' });
    expect(teacherActionError(e)).toBe(t.teacherBoard.lessonStarted);
  });

  it('anything else → try again', () => {
    expect(teacherActionError(new ApiError(409, { code: 'invalid_transition', message: 'x' }))).toBe(
      t.teacherBoard.actionFailed,
    );
    expect(teacherActionError(new Error('offline'))).toBe(t.teacherBoard.actionFailed);
  });
});
