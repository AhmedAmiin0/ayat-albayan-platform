import { fireEvent, screen } from '@testing-library/react-native';
import { t, ltr } from '@ab/mobile-kit';
import { fakeNow } from '@/test/fake-now';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '@/sales/sales/testing/fixtures';
import { SalesScheduleScreen } from '@/sales/sales/screens/SalesScheduleScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

// 18:00 Riyadh running (now 18:10), and a Cairo teacher with a Muscat student on the 20:00 one.
const LESSONS = [
  scheduleLesson({ trial: true }),
  scheduleLesson({
    id: 'l2',
    starts_at: '2026-10-12T17:00:00.000Z',
    ends_at: '2026-10-12T17:30:00.000Z',
    status: 'scheduled',
    teacher: { id: 't1', display_name_ar: 'أبرار محمد', display_name_en: null, tz: 'Africa/Cairo' },
    students: [{ id: 'st3', code: 'AB-0200', name: 'سلمى', tz: 'Asia/Muscat' }],
    meeting_link: 'https://meet.example.org/salma',
    platform_classroom: false,
  }),
];

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) =>
    path === '/sales/teachers' ? [teacher()] : { date: '2026-10-12', lessons: LESSONS },
  );
  fakeNow(new Date('2026-10-12T15:10:00.000Z'));
});
afterEach(() => jest.useRealTimers());

const openRow = async (who: string) =>
  fireEvent.press(
    await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', who) }),
  );

test('sales: a tap opens the details with every clock, the lesson link, her move / cancel / confirm and the student file; no admin action', async () => {
  await renderWithQuery(<SalesScheduleScreen />, confirmingQueryClient());
  // The agenda row never paints the URL: the tap opens the sheet that has it.
  await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'سلمى') });
  expect(screen.queryByText('https://meet.example.org/salma')).toBeNull();
  await openRow('سلمى');
  expect(screen.getByRole('header', { name: 'سلمى' })).toBeTruthy();
  // Any lesson not over yet is hers to move, cancel and confirm, so no read-only note.
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.cancel })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^تأكيد/ })).toHaveLength(1);
  expect(screen.getByRole('button', { name: t.sales.lessonActions.confirm })).toBeTruthy();
  expect(screen.getByText(ltr('AB-0200'))).toBeTruthy();
  expect(
    screen.getByText(new RegExp(`^${t.schedule.studentTime.replace('{time}', '')}`)),
  ).toBeTruthy();
  // 12 Oct: Cairo is on summer time, the same clock as the (Riyadh) viewer: no teacher line.
  expect(
    screen.queryByText(new RegExp(`^${t.schedule.teacherTime.replace('{time}', '')}`)),
  ).toBeNull();
  for (const label of [
    t.today.confirm,
    t.today.cancel,
    t.lessons.rescheduleSubmit,
    t.editTime.action,
    t.reports.view,
  ]) {
    expect(screen.queryByRole('button', { name: new RegExp(`^${label}$`) })).toBeNull();
  }
  // Sales see the lesson's full link with a copy button.
  expect(screen.getByText('https://meet.example.org/salma')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.lessons.copyLink })).toBeTruthy();
  // Any student's name opens their details.
  expect(
    screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'سلمى') }),
  ).toBeTruthy();
  // Not running: no join in the sheet, and never on the rows.
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
});

test('sales: a running lesson keeps «ادخل الحلقة» and «جارية الآن» in the sheet', async () => {
  await renderWithQuery(<SalesScheduleScreen />, confirmingQueryClient());
  await openRow('يوسف أحمد');
  // The sheet's only: the row carries no button.
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
  // The row's word and the sheet's.
  expect(screen.getAllByText(t.lessons.sheet.live)).toHaveLength(2);
});
