import { t } from '../../lib/i18n/i18n';
import { channelDayLabel } from './day-label';

const now = new Date('2026-10-27T12:00:00.000Z');
const label = (iso: string) => channelDayLabel(iso, { now, tz: 'Asia/Riyadh' });

test('today, yesterday, a weekday this week, else the date (the year when not this one)', () => {
  expect(label('2026-10-27T08:00:00.000Z')).toBe(t.inbox.dayToday);
  expect(label('2026-10-26T08:00:00.000Z')).toBe(t.inbox.dayYesterday);
  expect(label('2026-10-24T08:00:00.000Z')).toBe(t.enums.weekday['6']);
  expect(label('2026-09-29T08:00:00.000Z')).toMatch(/29/);
  expect(label('2025-09-29T08:00:00.000Z')).toMatch(/2025/);
});
