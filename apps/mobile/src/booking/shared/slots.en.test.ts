import { whenText } from './slots';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the picked slot reads in English and joins with «, », not the Arabic «، »', () => {
  expect(whenText('2026-10-04T14:00:00.000Z', 'America/New_York', '24')).toBe(
    'Sunday 4 October 17:00 Riyadh time, Student: Sunday 4 October 10:00 New York time',
  );
});
