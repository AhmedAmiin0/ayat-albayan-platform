import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { teacherActionError } from './teacher-lesson-api';

const w = t.teacherBoard;

test('409 lesson_started: «بدأت الحلقة…»', () => {
  expect(teacherActionError(new ApiError(409, { code: 'lesson_started' }))).toBe(w.lessonStarted);
});

test('any other refusal, an odd body or a network failure: the general line', () => {
  expect(teacherActionError(new ApiError(409, { code: 'invalid_transition' }))).toBe(
    w.actionFailed,
  );
  expect(teacherActionError(new ApiError(403, null))).toBe(w.actionFailed);
  expect(teacherActionError(new ApiError(500, { code: 42 }))).toBe(w.actionFailed);
  expect(teacherActionError(new TypeError('Network request failed'))).toBe(w.actionFailed);
});
