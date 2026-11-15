import { getCalendars } from 'expo-localization';
import { deviceUses24 } from './device-clock';

jest.mock('expo-localization', () => ({ getCalendars: jest.fn() }));
const calendars = jest.mocked(getCalendars);

type Calendar = ReturnType<typeof getCalendars>[number];
const calendar = (uses24hourClock: boolean | null): Calendar => ({
  uses24hourClock,
  calendar: null,
  firstWeekday: null,
  timeZone: null,
});

test('a 24-hour phone', () => {
  calendars.mockReturnValue([calendar(true)]);
  expect(deviceUses24()).toBe(true);
});

test('a 12-hour phone', () => {
  calendars.mockReturnValue([calendar(false)]);
  expect(deviceUses24()).toBe(false);
});

test('unknown, no calendar, or a throwing module → null (reads as 24 h)', () => {
  calendars.mockReturnValue([calendar(null)]);
  expect(deviceUses24()).toBeNull();
  calendars.mockReturnValue([] as unknown as ReturnType<typeof getCalendars>);
  expect(deviceUses24()).toBeNull();
  calendars.mockImplementation(() => {
    throw new Error('native module missing');
  });
  expect(deviceUses24()).toBeNull();
});
