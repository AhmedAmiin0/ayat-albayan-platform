import type { MessageView, TemplateView } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { meetReminder, message, notApproved } from '../thread-fixtures';
import { ratingApproved, ratingDone, ratingError } from './rating-words';

const rating = (status: TemplateView['status']): TemplateView => ({ ...meetReminder, key: 'lesson_rating', status });

test('only an approved lesson_rating enables the send', () => {
  expect(ratingApproved([rating('approved')])).toBe(true);
  expect(ratingApproved([rating('pending')])).toBe(false);
  expect(ratingApproved([meetReminder])).toBe(false);
  expect(ratingApproved(undefined)).toBe(false);
  expect(ratingApproved({} as unknown as TemplateView[])).toBe(false);
  expect(notApproved.status).not.toBe('approved');
});

test('the refusal codes are the web words, anything else is «لم يُرسل»', () => {
  expect(ratingError(new ApiError(409, { code: 'template_not_approved' }))).toBe(t.inbox.rating.notApproved);
  expect(ratingError(new ApiError(409, { code: 'no_completed_lesson' }))).toBe(t.inbox.rating.noLesson);
  expect(ratingError(new ApiError(400, { code: 'not_a_guardian' }))).toBe(t.inbox.rating.noLesson);
  expect(ratingError(new ApiError(500))).toBe(t.inbox.rating.failed);
  expect(ratingError(new Error('offline'))).toBe(t.inbox.rating.failed);
});

test('queued waits for the send gate, anything else went out', () => {
  const sent = (status: MessageView['status']) => message({ id: 'm9', status });
  expect(ratingDone(sent('queued'))).toBe(t.inbox.rating.queued);
  expect(ratingDone(sent('sent'))).toBe(t.inbox.rating.sent);
  expect(ratingDone(undefined)).toBeNull();
});
