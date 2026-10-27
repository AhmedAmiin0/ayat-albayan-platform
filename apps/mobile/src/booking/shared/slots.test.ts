import { t } from '@/core/lib/i18n/i18n';
import { MON_19, slot, SUN_17 } from '../testing/fixtures';
import { freeSlotDays, ruleFromSlot, slotLegend, slotTimes, slotWindow, whenText } from './slots';

test('the window is now → 7 days on, as ISO instants', () => {
  const now = new Date('2026-10-02T10:00:00.000Z');
  expect(slotWindow(now)).toEqual({
    from: '2026-10-02T10:00:00.000Z',
    to: '2026-10-09T10:00:00.000Z',
  });
});

test('ruleFromSlot reads the day, clock and weekday in the family zone', () => {
  expect(ruleFromSlot(SUN_17, 'Asia/Riyadh')).toEqual({
    startsOn: '2026-10-04',
    startTimeLocal: '17:00',
    weekday: 0,
  });
  // 03:30 Monday in Riyadh is still Sunday afternoon in Los Angeles: the rule is that Sunday.
  expect(ruleFromSlot('2026-10-05T00:30:00.000Z', 'America/Los_Angeles')).toEqual({
    startsOn: '2026-10-04',
    startTimeLocal: '17:30',
    weekday: 0,
  });
  expect(ruleFromSlot('2026-10-09T22:00:00.000Z', 'Asia/Riyadh')).toEqual({
    startsOn: '2026-10-10',
    startTimeLocal: '01:00',
    weekday: 6,
  });
});

test('only free slots, grouped by Riyadh day (not UTC), earliest first', () => {
  const lateSunday = '2026-10-04T21:30:00.000Z'; // 00:30 Monday in Riyadh
  const days = freeSlotDays([
    slot(MON_19),
    slot(SUN_17),
    slot('2026-10-04T15:00:00.000Z', true),
    slot(lateSunday),
  ]);
  expect(days.map((d) => d.date)).toEqual(['2026-10-04', '2026-10-05']);
  expect(days[0]?.label).toBe('الأحد 4 أكتوبر');
  expect(days[0]?.slots.map((s) => s.starts_at)).toEqual([SUN_17]);
  expect(days[1]?.label).toBe('الاثنين 5 أكتوبر');
  expect(days[1]?.slots.map((s) => s.starts_at)).toEqual([lateSunday, MON_19]);
  expect(freeSlotDays([slot(SUN_17, true)])).toEqual([]);
});

test('slot times: big Riyadh clock, the student clock only when the zone differs', () => {
  expect(slotTimes(SUN_17, 'Asia/Riyadh', '24')).toEqual({ riyadh: '17:00', local: null });
  expect(slotTimes(SUN_17, 'Asia/Dubai', '24')).toEqual({ riyadh: '17:00', local: '18:00 بتوقيت دبي' });
  expect(slotTimes(SUN_17, 'Pacific/Fiji', '24').local).toMatch(/بتوقيت ⁦Pacific\/Fiji⁩$/);
});

test('whenText: Riyadh first, then the student day and clock', () => {
  expect(whenText(SUN_17, 'Asia/Riyadh', '24')).toBe('الأحد 4 أكتوبر 17:00 بتوقيت الرياض');
  expect(whenText(SUN_17, 'Asia/Dubai', '24')).toBe(
    'الأحد 4 أكتوبر 17:00 بتوقيت الرياض، عند الطالب الأحد 4 أكتوبر 18:00 بتوقيت دبي',
  );
});

test('the legend names the student city, or just Riyadh', () => {
  expect(slotLegend('Asia/Riyadh')).toBe(t.booking.tzNote.replace('{city}', 'الرياض'));
  expect(slotLegend('Asia/Dubai')).toBe(t.booking.slotLegend.replace('{city}', 'دبي'));
});
