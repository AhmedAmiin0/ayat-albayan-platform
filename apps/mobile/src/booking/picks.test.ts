import { t } from '@/lib/i18n';
import { SUN_17, THU_18 } from './fixtures';
import { dayAtText, dayLine } from './picks';

test('dayLine: the weekday and time in the family’s zone, its city when not Riyadh', () => {
  const riyadh = t.booking.dayAt.replace('{day}', t.enums.weekday['4']).replace('{time}', '18:00');
  expect(dayLine(THU_18, 'Asia/Riyadh')).toBe(riyadh);
  const dubai = t.booking.dayAt.replace('{day}', t.enums.weekday['0']).replace('{time}', '18:00');
  expect(dayLine(SUN_17, 'Asia/Dubai')).toBe(t.schedule.inCity.replace('{time}', dubai).replace('{city}', t.tz['Asia/Dubai']));
});

test('dayAtText: dayAt, the time followed by the city when the zone is not Riyadh (as the web)', () => {
  const day = t.enums.weekday['6'];
  expect(dayAtText({ weekday: 6, time: '09:30' }, 'Asia/Riyadh')).toBe(t.booking.dayAt.replace('{day}', day).replace('{time}', '09:30'));
  const inCairo = t.schedule.inCity.replace('{time}', '09:30').replace('{city}', t.tz['Africa/Cairo']);
  expect(dayAtText({ weekday: 6, time: '09:30' }, 'Africa/Cairo')).toBe(t.booking.dayAt.replace('{day}', day).replace('{time}', inCairo));
});
