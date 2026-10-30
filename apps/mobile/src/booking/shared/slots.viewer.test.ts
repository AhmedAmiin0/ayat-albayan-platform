import { slotTimes, whenText } from './slots';

// docs/34: a Cairo teacher picks a Riyadh family's 18:00 slot.
const WINTER = '2026-11-05T15:00:00.000Z';
const SUMMER = '2026-10-22T15:00:00.000Z';
const CAIRO = { tz: 'Africa/Cairo', cycle: '24' } as const;
const RIYADH = { tz: 'Asia/Riyadh', cycle: '24' } as const;

test('a Cairo viewer: 17:00 big, the family 18:00 under it', () => {
  expect(slotTimes(WINTER, 'Asia/Riyadh', CAIRO)).toEqual({ main: '17:00', local: '18:00 بتوقيت الرياض' });
  expect(whenText(WINTER, 'Asia/Riyadh', CAIRO)).toBe(
    'الخميس 5 نوفمبر 17:00 بتوقيتك، عند الطالب الخميس 5 نوفمبر 18:00 بتوقيت الرياض',
  );
});

test('Cairo summer time reads as Riyadh: one clock', () => {
  expect(slotTimes(SUMMER, 'Asia/Riyadh', CAIRO)).toEqual({ main: '18:00', local: null });
  expect(whenText(SUMMER, 'Asia/Riyadh', CAIRO)).toBe('الخميس 22 أكتوبر 18:00 بتوقيتك');
});

test('a Riyadh viewer: no second clock', () => {
  expect(slotTimes(WINTER, 'Asia/Riyadh', RIYADH)).toEqual({ main: '18:00', local: null });
});
