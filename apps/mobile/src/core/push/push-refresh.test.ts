import { PUSH_KINDS } from '@ab/shared';
import { pushRefreshKeys } from './push-refresh';

// docs/48 MOBILE PUSH MAP: teacher tree only; the admin-only kinds refresh nothing.

const LESSON_KINDS = ['lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed'];

test.each(LESSON_KINDS)('teacher %s refreshes her lessons and /teachers/me', (kind) => {
  const keys = pushRefreshKeys('teacher', PUSH_KINDS.find((k) => k === kind) ?? null);
  expect(keys).toEqual([['lessons'], ['teachers', 'me']]);
});

test('teacher new_student refreshes /teachers/me only', () => {
  expect(pushRefreshKeys('teacher', 'new_student')).toEqual([['teachers', 'me']]);
});

test('the admin-only kinds and a null kind refresh nothing for the teacher', () => {
  expect(pushRefreshKeys('teacher', 'lesson_needs_confirmation')).toEqual([]);
  expect(pushRefreshKeys('teacher', 'report_submitted')).toEqual([]);
  expect(pushRefreshKeys('teacher', null)).toEqual([]);
});

test.each(['admin', 'sales', 'assistant'] as const)('the %s tree refreshes nothing new', (tree) => {
  for (const kind of PUSH_KINDS) expect(pushRefreshKeys(tree, kind)).toEqual([]);
});
