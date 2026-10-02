import type { AvailabilityRow } from '@/more/types';
import { lesson } from '@/today/fixtures';
import { ltr } from '@/ui/Ltr';
import { availabilityLine, teacherClock } from './agenda';
import { abrar, omar } from './overview-fixtures';
import { freeLabel, teacherMeta, windowsLine } from './overview-text';
import { dayLabel, weekLabel } from './week';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('«الجدول» sections in English: who, load and city; windows and free gaps on the Riyadh clock', () => {
  expect(teacherMeta(abrar)).toBe('Female teacher · The Holy Quran · Students: 3 of 10 · Cairo');
  expect(windowsLine(omar.windows)).toBe(`Available ${ltr('20:00 – 02:00')} Riyadh time`);
  const [gap] = abrar.free;
  if (!gap) throw new Error('fixture');
  expect(freeLabel(gap)).toBe(`Free ${ltr('10:45')} – ${ltr('16:00')}`);
});

test('days and the week range read in English with Western digits', () => {
  expect(dayLabel('2026-10-03')).toBe('Saturday 3 October');
  expect(weekLabel('2026-09-26')).toBe('26 September – 2 October');
});

test('the Cairo teacher’s clock and the availability line in English', () => {
  const winter = lesson({ id: 'w', starts_at: '2026-11-04T14:00:00.000Z', ends_at: '2026-11-04T14:45:00.000Z' });
  expect(teacherClock(winter)).toBe('Teacher: 16:00 Cairo time');
  const grid: AvailabilityRow[] = [
    { id: 'a', weekday: 3, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' },
    { id: 'b', weekday: 3, start_time: '20:00', end_time: '22:00', tz: 'Africa/Cairo' },
  ];
  expect(availabilityLine(grid, '2026-11-04', 'Africa/Cairo')).toBe(
    `Available ${ltr('16:00 – 18:00')}, ${ltr('20:00 – 22:00')} Cairo time`,
  );
});
