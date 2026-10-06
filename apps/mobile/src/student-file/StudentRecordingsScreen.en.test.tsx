import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { recording, recordingsPage } from './fixtures';
import { StudentRecordingsScreen } from './StudentRecordingsScreen';

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
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

test('an English run reads en.json: title, count, English teacher name, status, sizes, actions', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions: ['recordings.read', 'recordings.manage'] };
    if (path.startsWith('/students/s1/recordings')) return recordingsPage([recording()]);
    if (path === '/students/teacher-options') return [];
    return { name: 'Huda' };
  });
  await renderWithQuery(<StudentRecordingsScreen />);
  expect(await screen.findByRole('header', { name: 'Lesson recordings' })).toBeTruthy();
  expect(await screen.findByText('Recordings: 1')).toBeTruthy();
  expect(screen.getByText('Teacher: Abrar')).toBeTruthy();
  expect(screen.getByText('Size: 48 MB')).toBeTruthy();
  expect(screen.getByText('Ready')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Play the recording of lesson/ })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Last 7 days' })).toBeTruthy();
  expect(screen.getByText('Delete recording')).toBeTruthy();
});
