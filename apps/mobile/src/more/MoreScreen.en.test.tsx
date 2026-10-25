import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { instantDay } from '@/payments/format';
import { MoreScreen } from './MoreScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('an LTR run reads en.json, and «اللغة» offers العربية', async () => {
  expect(locale).toBe('en');
  expect(t).toEqual(en);
  await render(<MoreScreen />);
  expect(screen.getByRole('header', { name: en.mobile.more })).toBeTruthy();
  expect(screen.getByRole('header', { name: en.language.label })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.language.ar })).toBeTruthy();
  expect(screen.queryByRole('button', { name: en.language.en })).toBeNull();
});

test('dates follow the UI language, Western digits', () => {
  expect(instantDay('2026-09-30T22:30:00Z')).toBe('1 October 2026');
});
