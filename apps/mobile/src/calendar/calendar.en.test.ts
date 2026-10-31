import type { AvailabilityRow } from '@/more/types';
import { lesson } from '@/today/testing/fixtures';
import { ltr } from '@/core/ui/primitives/Ltr';
import { availabilityLine, teacherClock } from './agenda/agenda';
import { abrar, omar } from './overview/overview-fixtures';
import { freeLabel, teacherMeta, windowsLine } from './overview/overview-text';
import { dayLabel, weekLabel } from './lib/week';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('«الجدول» sections in English: who, load and city; windows and free gaps on the Riyadh clock', () => {
  expect(teacherMeta(abrar)).toBe('Female teacher · The Holy Quran · Students: 3 of 10 · Cairo');
  const available = `Available ${ltr('20:00 – 02:00')} Riyadh time`;
  expect(windowsLine(omar.windows, '24', 'Asia/Riyadh')).toBe(available);
  const [gap] = abrar.free;
  if (!gap) throw new Error('fixture');
  expect(freeLabel(gap, '24', 'Asia/Riyadh')).toBe(`Free ${ltr('10:45 – 16:00')}`);
});

test('days and the week range read in English with Western digits', () => {
  expect(dayLabel('2026-10-03')).toBe('Saturday 3 October');
  expect(weekLabel('2026-09-26')).toBe('26 September – 2 October');
});

test('the Cairo teacher’s clock and the availability line in English', () => {
  const winter = lesson({ id: 'w', starts_at: '2026-11-04T14:00:00.000Z', ends_at: '2026-11-04T14:45:00.000Z' });
  expect(teacherClock(winter, '24', 'Asia/Riyadh')).toBe('Teacher: 16:00 Cairo time');
  const grid: AvailabilityRow[] = [
    { id: 'a', weekday: 3, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' },
    { id: 'b', weekday: 3, start_time: '20:00', end_time: '22:00', tz: 'Africa/Cairo' },
  ];
  expect(availabilityLine(grid, { date: '2026-11-04', teacherTz: 'Africa/Cairo', cycle: '24' })).toBe(
    `Available ${ltr('16:00 – 18:00')}, ${ltr('20:00 – 22:00')} Cairo time`,
  );
});
