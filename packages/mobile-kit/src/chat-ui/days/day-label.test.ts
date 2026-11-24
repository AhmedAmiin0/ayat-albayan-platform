import { t } from '../../lib/i18n/i18n';
import { chatDayLabel } from './day-label';

// Day separators as WhatsApp, in the zone given (staff inbox and channel).
const now = new Date('2026-10-27T12:00:00.000Z');
const label = (iso: string) => chatDayLabel(iso, { now, tz: 'Asia/Riyadh' });

test('today, yesterday, a weekday this week, else the date (the year when not this one)', () => {
  expect(label('2026-10-27T08:00:00.000Z')).toBe(t.inbox.dayToday);
  expect(label('2026-10-26T08:00:00.000Z')).toBe(t.inbox.dayYesterday);
  expect(label('2026-10-24T08:00:00.000Z')).toBe(t.enums.weekday['6']);
  expect(label('2026-09-29T08:00:00.000Z')).toBe('29 سبتمبر');
  expect(label('2025-12-31T08:00:00.000Z')).toBe('31 ديسمبر 2025');
});

test('the day is the zone’s: 22:30 UTC is already tomorrow in Riyadh, still yesterday in UTC', () => {
  const late = '2026-10-26T22:30:00Z';
  expect(label(late)).toBe(t.inbox.dayToday);
  expect(chatDayLabel(late, { now, tz: 'UTC' })).toBe(t.inbox.dayYesterday);
});
