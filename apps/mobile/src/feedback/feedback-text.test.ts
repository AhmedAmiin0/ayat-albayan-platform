import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { answered, pending } from './fixtures';
import { answerLine, askable, averageLine, recommendLine, requestError } from './feedback-text';

const text = t.mobile.feedback;

test('average and «نعم» share: one decimal / whole percent, nothing before an answer', () => {
  expect(averageLine({ avg_rating: 4.25, n: 8, recommend_yes_pct: 62.5 })).toBe(
    text.averageLine.replace('{avg}', '4.3').replace('{n}', '8'),
  );
  expect(recommendLine({ avg_rating: 4.25, n: 8, recommend_yes_pct: 62.5 })).toBe(text.recommendLine.replace('{pct}', '63'));
  expect(averageLine({ avg_rating: null, n: 0, recommend_yes_pct: null })).toBeNull();
  expect(recommendLine({ avg_rating: null, n: 0, recommend_yes_pct: null })).toBeNull();
});

test('an answered row leads with «5 من 5 · نعم»; a pending one has no answer line', () => {
  expect(answerLine(answered)).toBe(`${text.ratingValue.replace('{n}', '5')} · ${text.answer.yes}`);
  expect(answerLine({ ...answered, recommend: null })).toBe(text.ratingValue.replace('{n}', '5'));
  expect(answerLine(pending)).toBeNull();
});

test('the request’s refusals in words; anything else is the generic error', () => {
  expect(requestError(new ApiError(409, { code: 'already_submitted' }))).toBe(text.error.already_submitted);
  expect(requestError(new ApiError(409, { code: 'template_not_approved' }))).toBe(text.error.template_not_approved);
  expect(requestError(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
  expect(requestError(new TypeError('Network request failed'))).toBe(t.common.error);
});

test('only a completed or late lesson can be asked, and not a student who missed it', () => {
  const on = (status: string, attendance: string | null) =>
    askable({ status, students: [{ id: 's', attendance }] } as unknown as Parameters<typeof askable>[0]).length;
  expect(['completed', 'late'].map((s) => on(s, 'on_time'))).toEqual([1, 1]);
  expect(['scheduled', 'confirmed', 'no_show', 'excused'].map((s) => on(s, null))).toEqual([0, 0, 0, 0]);
  expect([on('completed', 'absent'), on('completed', 'excused')]).toEqual([0, 0]);
});
