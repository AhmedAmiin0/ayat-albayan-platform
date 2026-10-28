import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from './SalesScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

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
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => (path === '/sales/teachers' ? [teacher()] : { date: '2026-10-12', lessons: LESSONS }));
  fakeNow(new Date('2026-10-12T15:10:00.000Z'));
});
afterEach(() => jest.useRealTimers());

const openRow = async (who: string) =>
  fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', who) }));

test('sales: a tap opens the details with every clock, the lesson link, her move / cancel and the student file; no admin action', async () => {
  await renderWithQuery(<SalesScheduleScreen />);
  // The agenda row never paints the URL: the tap opens the sheet that has it.
  await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'سلمى') });
  expect(screen.queryByText('https://meet.example.org/salma')).toBeNull();
  await openRow('سلمى');
  expect(screen.getByRole('header', { name: 'سلمى' })).toBeTruthy();
  // Owner 2026-10-28: any lesson not over yet is hers to move or cancel, so no «للاطلاع فقط».
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.cancel })).toBeTruthy();
  expect(screen.getByText(ltr('AB-0200'))).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.schedule.studentTime.replace('{time}', '')}`))).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.schedule.teacherTime.replace('{time}', '')}`))).toBeTruthy();
  for (const label of [t.today.confirm, t.today.cancel, t.lessons.rescheduleSubmit, t.editTime.action, t.reports.view]) {
    expect(screen.queryByRole('button', { name: new RegExp(`^${label}$`) })).toBeNull();
  }
  // Owner 2026-10-26: sales see the lesson's link, full, with «انسخ الرابط».
  expect(screen.getByText('https://meet.example.org/salma')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.lessons.copyLink })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'سلمى') })).toBeTruthy();
  // Not running: no «ادخل الحلقة» in the sheet (the running row keeps its own).
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
});

test('sales: a running lesson keeps «ادخل الحلقة» and «جارية الآن» in the sheet', async () => {
  await renderWithQuery(<SalesScheduleScreen />);
  await openRow('يوسف أحمد');
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(2);
  // The row's chip and the sheet's.
  expect(screen.getAllByText(t.lessons.sheet.live)).toHaveLength(2);
});
