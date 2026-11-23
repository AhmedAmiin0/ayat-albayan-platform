import { ApiError, t } from '@ab/mobile-kit';
import { teacherActionError } from '@/teacher/lesson-actions/teacher-lesson-api/teacher-lesson-api';

const w = t.teacherBoard;

test('409 lesson_started: «بدأت الحلقة…»', () => {
  expect(teacherActionError(new ApiError(409, { code: 'lesson_started' }))).toBe(w.lessonStarted);
});

test('no answer at all (offline): «انقطع الاتصال…» (docs/48)', () => {
  expect(teacherActionError(new TypeError('Network request failed'))).toBe(w.offline);
});

test('any other refusal or an odd body: the general line', () => {
  expect(teacherActionError(new ApiError(409, { code: 'invalid_transition' }))).toBe(
    w.actionFailed,
  );
  expect(teacherActionError(new ApiError(403, null))).toBe(w.actionFailed);
  expect(teacherActionError(new ApiError(500, { code: 42 }))).toBe(w.actionFailed);
});
