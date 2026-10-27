import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { history, scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from './SalesScheduleScreen';
import { SalesTeacherScreen } from './SalesTeacherScreen';
import { SalesTeachersScreen } from './SalesTeachersScreen';
import { SubscriptionHistoryScreen } from './SubscriptionHistoryScreen';

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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 't1' }),
}));

test('an English run reads en.json: the teacher’s English name, gender and programs', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockResolvedValue([teacher()]);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText('Abrar Mohamed')).toBeTruthy();
  expect(screen.getByRole('header', { name: en.sales.teachers.title })).toBeTruthy();
  expect(screen.getByText(`Female · ${en.enums.program.quran}, ${en.enums.program.arabic}`)).toBeTruthy();
  expect(screen.getByText(en.studentLists.counts.replace('{active}', '1').replace('{trial}', '1'))).toBeTruthy();
});

test('an English run of the history: title, statuses and the «Current» mark in English', async () => {
  mockApiFetch.mockResolvedValue(history());
  await renderWithQuery(<SubscriptionHistoryScreen />);
  expect(await screen.findByRole('header', { name: en.sales.history.title.replace('{name}', 'يوسف أحمد') })).toBeTruthy();
  expect(screen.getByText(en.sales.history.current)).toBeTruthy();
  expect(screen.getByText(`${en.enums.packageSize['8']} · ${en.enums.subscriptionStatus.expired}`)).toBeTruthy();
});

test('an English run of a teacher’s students and the read-only schedule', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/teachers'
      ? [teacher({ meeting_link: 'https://meet.example.org/abrar-fixed' })]
      : { date: '2026-10-12', lessons: [scheduleLesson({ trial: true })] },
  );
  const first = await renderWithQuery(<SalesTeacherScreen />);
  expect(await screen.findByRole('header', { name: "Abrar Mohamed's students" })).toBeTruthy();
  expect(screen.getByText(en.studentLists.meetingLink)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.studentLists.shareLink })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: `${en.studentLists.trial} 1` }));
  expect(screen.getByText(en.enums.studentStatus.trial)).toBeTruthy();
  expect(screen.getByRole('button', { name: "Show the teacher's schedule today" })).toBeTruthy();
  await first.unmount();
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText(en.sales.lessonActions.ownNote)).toBeTruthy();
  expect(await screen.findByText(en.schedule.trialTag)).toBeTruthy();
});
