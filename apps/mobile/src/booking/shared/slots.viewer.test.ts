import { setViewerPersonTz } from '@ab/client-core';
import { slotTimes, whenText } from './slots';

// docs/34: a Cairo teacher picks a Riyadh family's 18:00 slot.
const WINTER = '2026-11-05T15:00:00.000Z';
const SUMMER = '2026-10-22T15:00:00.000Z';

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('a Cairo viewer: 17:00 big, the family 18:00 under it', () => {
  setViewerPersonTz('Africa/Cairo');
  expect(slotTimes(WINTER, 'Asia/Riyadh', '24')).toEqual({ main: '17:00', local: '18:00 بتوقيت الرياض' });
  expect(whenText(WINTER, 'Asia/Riyadh', '24')).toBe(
    'الخميس 5 نوفمبر 17:00 بتوقيتك، عند الطالب الخميس 5 نوفمبر 18:00 بتوقيت الرياض',
  );
});

test('Cairo summer time reads as Riyadh: one clock', () => {
  setViewerPersonTz('Africa/Cairo');
  expect(slotTimes(SUMMER, 'Asia/Riyadh', '24')).toEqual({ main: '18:00', local: null });
  expect(whenText(SUMMER, 'Asia/Riyadh', '24')).toBe('الخميس 22 أكتوبر 18:00 بتوقيتك');
});

test('a Riyadh viewer: no second clock', () => {
  expect(slotTimes(WINTER, 'Asia/Riyadh', '24')).toEqual({ main: '18:00', local: null });
});
