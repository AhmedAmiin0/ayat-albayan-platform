import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));

test('an English (LTR) run of «Student details»: en.json words for the subscription, attendance and reports', async () => {
  expect(t).toEqual(en);
  expect(I18nManager.isRTL).toBe(false);
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  const s = en.sales.student;
  for (const text of [s.subscription, s.current, s.attendance, s.reports, s.kind.present, s.kind.absent, s.showPast.replace('{n}', '1')]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.getByText(s.totals.replace('{present}', '1').replace('{absent}', '1').replace('{excused}', '0').replace('{cancelled}', '1'))).toBeTruthy();
  expect(screen.getByText(en.reports.downloadPdf)).toBeTruthy();
});

test('an English (LTR) «Schedule»: the weekly line, the student\'s time, the upcoming rows and the empty states', async () => {
  const s = en.sales.student.schedule;
  mockApiFetch.mockResolvedValue(details());
  const first = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.title)).toBeTruthy();
  expect(screen.getByText(/^Sunday · Tuesday · Thursday at /)).toBeTruthy();
  expect(screen.getByText(/^Student's time: Sunday · Tuesday · Thursday at .+ Cairo time$/)).toBeTruthy();
  expect(screen.getByText(s.upcoming)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: en.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد') })).toHaveLength(2);
  await first.unmount();
  mockApiFetch.mockResolvedValue(details({ schedule: { weekly: [], upcoming: [] } }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.noWeekly)).toBeTruthy();
  expect(screen.getByText(s.noUpcoming)).toBeTruthy();
});
