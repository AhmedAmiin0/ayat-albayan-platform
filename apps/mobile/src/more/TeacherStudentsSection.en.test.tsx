import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { listItem } from '@/students/test-data';
import { TeacherStudentsSection } from './TeacherStudentsSection';

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
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('an English run: the section, the switch and the student statuses in English', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/students/status-counts')
      ? { trial: 0, active: 1, paused: 0, churned: 0 }
      : { items: [listItem({ name: 'Huda' })], total: 1, page: 1, pageSize: 50 },
  );
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" />);
  expect(await screen.findByText('Huda')).toBeTruthy();
  expect(screen.getByRole('header', { name: en.studentLists.section })).toBeTruthy();
  expect(await screen.findByRole('tab', { name: `${en.studentLists.trial} 0` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${en.studentLists.all} 1` })).toBeTruthy();
});
