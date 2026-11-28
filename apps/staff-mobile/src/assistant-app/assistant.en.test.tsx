import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { savedProfile } from '@/test/account';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { AssistantHomeScreen } from './AssistantHomeScreen';
import { AssistantMoreScreen } from './AssistantMoreScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// /me/profile answers a profile (the «More» header reads its name); every list answers empty.
const PROFILE = savedProfile({
  full_name: 'Sara Ali',
  role: { base: 'assistant', key: null, name_ar: null, name_en: null },
});
const mockApiFetch = jest.fn(async (p: string) => (p === '/me/profile' ? PROFILE : []));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({ ...jest.requireActual('@ab/mobile-kit/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

afterEach(() => jest.useRealTimers());

test('the assistant home reads en.json', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  expect(t).toEqual(en);
  await renderWithQuery(<AssistantHomeScreen can={() => true} />);
  expect(screen.getByRole('header', { name: en.mobileRoles.lessonsTitle })).toBeTruthy();
  expect(await screen.findByText(en.classroom.assistants.homeEmpty)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.mobileClassroom.meetingsRow })).toBeTruthy();
});

test('the assistant «More» reads en.json', async () => {
  await renderWithQuery(<AssistantMoreScreen />);
  expect(screen.getByText(en.mobileRoles.assistantRole)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.auth.logout })).toBeTruthy();
});
