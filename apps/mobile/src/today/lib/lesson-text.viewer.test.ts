import { lesson, yusuf } from '@/today/testing/fixtures';
import { lessonClock, studentTimes } from './lesson-text';

// docs/34: a Riyadh family's 18:00 lesson read by a Cairo teacher and by a Riyadh viewer.
const CAIRO = 'Africa/Cairo';
const RIYADH = 'Asia/Riyadh';
const winter = lesson({ id: 'w', starts_at: '2026-11-05T15:00:00.000Z', students: [yusuf] });
const summer = lesson({ id: 's', starts_at: '2026-10-22T15:00:00.000Z', students: [yusuf] });

test('a Cairo viewer sees 17:00 and the family clock beside it in winter', () => {
  expect(lessonClock(winter.starts_at, CAIRO, '24')).toBe('17:00');
  expect(studentTimes(winter, '24', CAIRO)).toEqual(['18:00 بتوقيت الرياض']);
});

test('a Riyadh viewer sees 18:00 and no second clock', () => {
  expect(lessonClock(winter.starts_at, RIYADH, '24')).toBe('18:00');
  expect(studentTimes(winter, '24', RIYADH)).toEqual([]);
});

test('in Cairo summer time (UTC+3) both clocks read 18:00: no second clock', () => {
  expect(lessonClock(summer.starts_at, CAIRO, '24')).toBe('18:00');
  expect(studentTimes(summer, '24', CAIRO)).toEqual([]);
});
