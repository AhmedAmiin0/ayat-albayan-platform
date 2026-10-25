import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { deleteError, visibilityError } from './recording-actions';

const R = t.mobileStudentFile.recordings;

test('a group lesson 409 gets its own message; other failures the generic one', () => {
  expect(visibilityError(new ApiError(409, { code: 'recording_group_lesson' }))).toBe(R.visible.groupLesson);
  expect(visibilityError(new ApiError(409, { code: 'other' }))).toBe(R.visible.failed);
  expect(visibilityError(new ApiError(500))).toBe(R.visible.failed);
  expect(visibilityError(new Error('offline'))).toBe(R.visible.failed);
});

test('delete: 409 means the recording is still running', () => {
  expect(deleteError(new ApiError(409))).toBe(R.delete.inProgress);
  expect(deleteError(new ApiError(403))).toBe(R.delete.failed);
});
