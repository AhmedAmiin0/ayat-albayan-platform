import { slotLine, slotsInWeekOrder } from './overview-text';

// docs/34: a slot's `at` (its next start) reads in the viewer's zone; without it, the API's Riyadh.
const thursday18 = { rule_id: 'r', weekday: 4, time: '18:00', duration_min: 45, students: [] };
const winter = { ...thursday18, at: '2026-11-05T15:00:00.000Z' };

test('a Cairo viewer reads the Riyadh 18:00 slot as 17:00 in winter', () => {
  expect(slotLine(winter, '24', 'Africa/Cairo')).toBe('الخميس الساعة 17:00 · 45 دقيقة');
  expect(slotsInWeekOrder([winter], 'Africa/Cairo').map((s) => s.time)).toEqual(['17:00']);
});

test('a Riyadh viewer, or a payload without `at`, keeps 18:00', () => {
  expect(slotLine(winter, '24', 'Asia/Riyadh')).toBe('الخميس الساعة 18:00 · 45 دقيقة');
  expect(slotLine(thursday18, '24', 'Africa/Cairo')).toBe('الخميس الساعة 18:00 · 45 دقيقة');
});
