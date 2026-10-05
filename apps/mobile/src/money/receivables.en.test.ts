import { fxMissingText } from './receivables';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the FX gap lists currencies with «, » in English, not the Arabic «، »', () => {
  expect(fxMissingText(['EGP', 'USD'])).toBe(
    'No exchange rate for EGP, USD, so they are left out of the total',
  );
});
