import { freeSlotDays, slotTimes, whenText } from '../slot-text';

// Moved with the slot words from the staff app (the family's slot picker reads them too).
const R24 = { tz: 'Asia/Riyadh', cycle: '24' } as const;
const SUN_17 = '2026-10-04T14:00:00.000Z';
const MON_19 = '2026-10-05T16:00:00.000Z';
const slot = (starts_at: string, busy = false) => ({
  starts_at,
  conflicts: busy ? [{ kind: 'teacher_busy' }] : [],
});

test('only free slots, grouped by the viewer day (Riyadh here, not UTC), earliest first', () => {
  const lateSunday = '2026-10-04T21:30:00.000Z'; // 00:30 Monday in Riyadh
  const days = freeSlotDays(
    [slot(MON_19), slot(SUN_17), slot('2026-10-04T15:00:00.000Z', true), slot(lateSunday)],
    'Asia/Riyadh',
  );
  expect(days.map((d) => d.date)).toEqual(['2026-10-04', '2026-10-05']);
  expect(days[0]?.label).toBe('الأحد 4 أكتوبر');
  expect(days[0]?.slots.map((s) => s.starts_at)).toEqual([SUN_17]);
  expect(days[1]?.label).toBe('الاثنين 5 أكتوبر');
  expect(days[1]?.slots.map((s) => s.starts_at)).toEqual([lateSunday, MON_19]);
  expect(freeSlotDays([slot(SUN_17, true)], 'Asia/Riyadh')).toEqual([]);
});

test('slot times: big viewer clock, the student clock only when it differs', () => {
  expect(slotTimes(SUN_17, 'Asia/Riyadh', R24)).toEqual({ main: '17:00', local: null });
  const dubai = { main: '17:00', local: '18:00 بتوقيت دبي' };
  expect(slotTimes(SUN_17, 'Asia/Dubai', R24)).toEqual(dubai);
  // 4 Oct: Cairo is on summer time, the same clock as Riyadh.
  expect(slotTimes(SUN_17, 'Africa/Cairo', R24).local).toBeNull();
  expect(slotTimes(SUN_17, 'Pacific/Fiji', R24).local).toMatch(/بتوقيت ⁦Pacific\/Fiji⁩$/);
});

test('whenText: the viewer first, then the student day and clock', () => {
  expect(whenText(SUN_17, 'Asia/Riyadh', R24)).toBe('الأحد 4 أكتوبر 17:00 بتوقيتك');
  expect(whenText(SUN_17, 'Asia/Dubai', R24)).toBe(
    'الأحد 4 أكتوبر 17:00 بتوقيتك، عند الطالب الأحد 4 أكتوبر 18:00 بتوقيت دبي',
  );
});

test('a family slot (no conflicts field) is free', () => {
  expect(freeSlotDays([{ starts_at: SUN_17 }], 'Asia/Riyadh')[0]?.slots).toHaveLength(1);
});
