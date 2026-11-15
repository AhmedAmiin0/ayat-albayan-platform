import { ApiError, t } from '@ab/mobile-kit';
import { confirmFailureText } from './confirm-lesson';

const a = t.sales.lessonActions;

test('lesson_ended and invalid_transition read as a confirm; anything else the general wording', () => {
  expect(confirmFailureText(new ApiError(409, { code: 'lesson_ended' }), '24', 'Asia/Riyadh')).toBe(a.confirmEnded);
  expect(confirmFailureText(new ApiError(409, { code: 'invalid_transition' }), '24', 'Asia/Riyadh')).toBe(a.confirmInvalid);
  expect(confirmFailureText(new ApiError(404, { code: 'lesson_not_found' }), '24', 'Asia/Riyadh')).toBe(t.lessons.error.lesson_not_found);
  expect(confirmFailureText(new ApiError(500), '24', 'Asia/Riyadh')).toBe(t.common.error);
});
