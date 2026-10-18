import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Appearance } from 'react-native';
import { t } from '@/lib/i18n';
import { APPEARANCE_KEY } from './appearance';
import { MoreScreen } from './MoreScreen';
import { signOutDevice } from './sign-out';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

let setScheme: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('«المزيد» title; المعلمين, طلبات التوظيف and حاسبة الأسعار open their screens («الجدول» is a tab)', async () => {
  await render(<MoreScreen />);
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.schedule.nav })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.nav.teachers }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers');
  await fireEvent.press(screen.getByRole('button', { name: t.nav.jobApplicants }));
  expect(router.push).toHaveBeenCalledWith('/more/job-applicants');
  await fireEvent.press(screen.getByRole('button', { name: t.pricing.title }));
  expect(router.push).toHaveBeenCalledWith('/more/pricing');
});

test('المظهر: تلقائي by default; ليلي applies dark at once and is saved', async () => {
  await render(<MoreScreen />);
  expect(await screen.findByRole('radio', { name: t.theme.auto, checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.theme.dark }));
  expect(screen.getByRole('radio', { name: t.theme.dark, checked: true })).toBeTruthy();
  expect(setScheme).toHaveBeenCalledWith('dark');
  expect(await AsyncStorage.getItem(APPEARANCE_KEY)).toBe('dark');
});

test('a saved choice shows selected and is re-applied', async () => {
  await AsyncStorage.setItem(APPEARANCE_KEY, 'light');
  await render(<MoreScreen />);
  expect(await screen.findByRole('radio', { name: t.theme.light, checked: true })).toBeTruthy();
  expect(setScheme).toHaveBeenCalledWith('light');
});

test('owner 2026-10-18 «cannot see the logout button»: with every section shown, تسجيل الخروج scrolls into view', async () => {
  await render(<MoreScreen />);
  const scroller = screen.getByTestId('screen-scroll');
  expect(within(scroller).getByRole('button', { name: t.auth.logout })).toBeTruthy();
});

test('تسجيل الخروج signs this device out (push token first, then the session)', async () => {
  await render(<MoreScreen />);
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalledTimes(1);
});
