import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { answered, pending } from './fixtures';
import { averageLine, canRequestFeedback, recommendLine, requestError, rowLines } from './feedback-text';

const text = t.mobile.feedback;

test('average and «نعم» share: one decimal / whole percent, nothing before an answer', () => {
  expect(averageLine({ avg_rating: 4.25, n: 8, recommend_yes_pct: 62.5 })).toBe(
    text.averageLine.replace('{avg}', '4.3').replace('{n}', '8'),
  );
  expect(recommendLine({ avg_rating: 4.25, n: 8, recommend_yes_pct: 62.5 })).toBe(text.recommendLine.replace('{pct}', '63'));
  expect(averageLine({ avg_rating: null, n: 0, recommend_yes_pct: null })).toBeNull();
  expect(recommendLine({ avg_rating: null, n: 0, recommend_yes_pct: null })).toBeNull();
});

test('an answered row says type, rating, «ترشّح»; a pending one only that it waits', () => {
  expect(rowLines(answered)).toEqual([
    text.kind.trial,
    `${text.rating}: ${text.ratingValue.replace('{n}', '5')}`,
    `${text.recommend} ${text.answer.yes}`,
    'الحلقة كانت ممتازة',
  ]);
  expect(rowLines(pending)).toEqual([text.kind.subscription, text.pending]);
  expect(rowLines({ ...answered, recommend: null, note: null })).toHaveLength(2);
});

test('the request’s refusals in words; anything else is the generic error', () => {
  expect(requestError(new ApiError(409, { code: 'already_submitted' }))).toBe(text.error.already_submitted);
  expect(requestError(new ApiError(409, { code: 'template_not_approved' }))).toBe(text.error.template_not_approved);
  expect(requestError(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
  expect(requestError(new TypeError('Network request failed'))).toBe(t.common.error);
});

test('only a completed or late lesson can be asked', () => {
  expect(['completed', 'late'].every(canRequestFeedback)).toBe(true);
  expect(['scheduled', 'confirmed', 'no_show', 'excused'].some(canRequestFeedback)).toBe(false);
});
