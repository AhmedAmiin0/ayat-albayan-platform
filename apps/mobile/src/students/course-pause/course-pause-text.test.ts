import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments';
import { bannerLines, pauseErrorText, previewLine, resumedText } from './course-pause-text';
import { pauseView, TODAY } from './fixtures';

const c = t.coursePause;

test('the preview line: none, one, two, a few, many', () => {
  expect(previewLine(0)).toBe(c.preview.zero);
  expect(previewLine(1)).toBe(c.preview.one);
  expect(previewLine(2)).toBe(c.preview.two);
  expect(previewLine(5)).toBe(c.preview.few.replace('{n}', '5'));
  expect(previewLine(12)).toBe(c.preview.other.replace('{n}', '12'));
});

test('the banner: until a day, the reason; no start line once it has begun', () => {
  expect(bannerLines(pauseView(), TODAY)).toEqual({
    title: c.bannerUntil.replace('{date}', localDay('2026-11-10')),
    starts: null,
    reason: c.bannerReason.replace('{reason}', 'سفر الأسرة'),
  });
});

test('the banner: open-ended, starting later, no reason', () => {
  expect(bannerLines(pauseView({ from_date: '2026-11-02', until_date: null, reason: null }), TODAY)).toEqual({
    title: c.bannerOpen,
    starts: c.bannerFrom.replace('{date}', localDay('2026-11-02')),
    reason: null,
  });
});

test('resumed, with the clashes of the lessons booked back', () => {
  expect(resumedText({ conflicts: 0 })).toBe(c.resumed);
  expect(resumedText({ conflicts: 2 })).toBe(c.resumedConflicts.replace('{n}', '2'));
});

test('errors: the API codes, anything else the general line', () => {
  expect(pauseErrorText(new ApiError(400, { code: 'date_in_past' }))).toBe(c.errors.date_in_past);
  expect(pauseErrorText(new ApiError(409, { code: 'already_paused' }))).toBe(c.errors.already_paused);
  expect(pauseErrorText(new ApiError(500))).toBe(c.errors.generic);
  expect(pauseErrorText(new Error('offline'))).toBe(c.errors.generic);
});
