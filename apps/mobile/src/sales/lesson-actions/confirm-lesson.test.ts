import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { scheduleLesson } from '../testing/fixtures';
import { canConfirmLesson, confirmFailureText } from './confirm-lesson';

const NOW = new Date('2026-10-12T14:00:00.000Z');
const a = t.sales.lessonActions;
// scheduleLesson: another family's lesson (no `mine`), ending 15:30Z; scheduled here.
const lesson = scheduleLesson({ status: 'scheduled' });

test('any scheduled lesson that has not ended, with lessons.confirm: hers or not', () => {
  expect(canConfirmLesson(lesson, { now: NOW, holds: true })).toBe(true);
  expect(canConfirmLesson(lesson, { now: NOW, holds: false })).toBe(false);
  expect(canConfirmLesson(lesson, { now: new Date(Date.parse(lesson.ends_at) + 1), holds: true })).toBe(false);
  for (const status of ['confirmed', 'completed', 'cancelled_by_admin', 'rescheduled'] as const) {
    expect(canConfirmLesson({ ...lesson, status }, { now: NOW, holds: true })).toBe(false);
  }
});

test('lesson_ended and invalid_transition read as a confirm; anything else the general wording', () => {
  expect(confirmFailureText(new ApiError(409, { code: 'lesson_ended' }))).toBe(a.confirmEnded);
  expect(confirmFailureText(new ApiError(409, { code: 'invalid_transition' }))).toBe(a.confirmInvalid);
  expect(confirmFailureText(new ApiError(404, { code: 'lesson_not_found' }))).toBe(t.lessons.error.lesson_not_found);
  expect(confirmFailureText(new ApiError(500))).toBe(t.common.error);
});
