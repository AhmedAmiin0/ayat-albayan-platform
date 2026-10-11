import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { history, teacher } from './fixtures';
import { SalesTeachersScreen } from './SalesTeachersScreen';
import { SubscriptionHistoryScreen } from './SubscriptionHistoryScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

test('an English run reads en.json: the teacher’s English name, gender and programs', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockResolvedValue([teacher()]);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText('Abrar Mohamed')).toBeTruthy();
  expect(screen.getByRole('header', { name: en.sales.teachers.title })).toBeTruthy();
  expect(screen.getByText(`Female · ${en.enums.program.quran}, ${en.enums.program.arabic}`)).toBeTruthy();
});

test('an English run of the history: title, statuses and the «Current» mark in English', async () => {
  mockApiFetch.mockResolvedValue(history());
  await renderWithQuery(<SubscriptionHistoryScreen />);
  expect(await screen.findByRole('header', { name: en.sales.history.title.replace('{name}', 'يوسف أحمد') })).toBeTruthy();
  expect(screen.getByText(en.sales.history.current)).toBeTruthy();
  expect(screen.getByText(`${en.enums.packageSize['8']} · ${en.enums.subscriptionStatus.expired}`)).toBeTruthy();
});
