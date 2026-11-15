import { zoneNote } from '@/core/lib/clock';
import { shortDate } from '@/today';
import { teacherDateLine } from './header-line';

const now = new Date('2026-10-01T14:00:00Z');

test('the short date alone when her zone is the phone’s', () => {
  const zones = { viewer: 'Africa/Cairo', device: 'Africa/Cairo' };
  expect(teacherDateLine(now, zones)).toBe(shortDate(now));
  expect(shortDate(now)).not.toMatch(/2026/);
});

test('the zone note after it when her profile zone differs from the phone’s', () => {
  const zones = { viewer: 'Africa/Cairo', device: 'Asia/Riyadh' };
  expect(teacherDateLine(now, zones)).toBe(`${shortDate(now)} · ${zoneNote('Africa/Cairo')}`);
});
