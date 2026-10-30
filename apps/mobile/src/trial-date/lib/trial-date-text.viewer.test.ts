import { setViewerPersonTz } from '@ab/client-core';
import { lessonWhenText } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { whenLines } from './trial-date-text';

// docs/34: a Riyadh family's 18:00 trial read by a Cairo salesperson.
const WINTER = '2026-11-05T15:00:00.000Z';
const SUMMER = '2026-10-22T15:00:00.000Z';
const ar = (iso: string, tz: string) => lessonWhenText(new Date(iso), tz, 'ar');

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('a Cairo viewer reads 17:00 as theirs, with the family 18:00 beside it', () => {
  setViewerPersonTz('Africa/Cairo');
  expect(whenLines(WINTER, 'Asia/Riyadh', '24')).toEqual({
    when: `${ar(WINTER, 'Africa/Cairo')} ${t.schedule.viewerTime}`,
    family: t.trialDate.familyTime.replace('{time}', ar(WINTER, 'Asia/Riyadh')),
  });
  expect(ar(WINTER, 'Africa/Cairo')).toMatch(/17:00$/);
});

test('in Cairo summer time the clocks agree: no family line', () => {
  setViewerPersonTz('Africa/Cairo');
  expect(whenLines(SUMMER, 'Asia/Riyadh', '24').family).toBeNull();
});
