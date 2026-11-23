import { SUN_17 } from '@/booking/testing/fixtures';
import { ruleFromSlot, slotWindow } from '@/booking/shared/slots/slots';

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
