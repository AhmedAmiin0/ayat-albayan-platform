import en from '@ab/shared/i18n/en.json';
import { emptyContent } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AdminReportScreen } from './AdminReportScreen';
import { report } from '../shared/fixtures';

// An English run: the native flag is LTR, so `t` is en.json and surah names are English.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ reportId: 'r1' }),
}));

test('English: the new-form report reads en.json and English surah names', async () => {
  expect(t).toEqual(en);
  const content = { ...emptyContent(), segments: [{ kind: 'revision' as const, surah: 68, from: 1, to: 20, grade: 'good' as const }] };
  mockApiFetch.mockResolvedValue(report({ form_version: 2, content, attendance: 'late', homework: null }));
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByText('New form')).toBeTruthy();
  expect(screen.getByText('Attended late')).toBeTruthy();
  expect(screen.getByText('Revision')).toBeTruthy();
  expect(screen.getByText(`Surah Al-Qalam · ayahs 1–20 · ${en.enums.grade.good}`)).toBeTruthy();
  expect(screen.getByText('Homework before the next lesson')).toBeTruthy();
});
