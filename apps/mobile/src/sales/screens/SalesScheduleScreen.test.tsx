import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { statusWord } from '@/core/ui/feedback/lesson-status';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from './SalesScheduleScreen';

const mockApiFetch = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => mockParams }));

const LESSONS = [
  scheduleLesson({ trial: true }),
  scheduleLesson({ id: 'l2', starts_at: '2026-10-12T17:00:00.000Z', ends_at: '2026-10-12T17:30:00.000Z', status: 'scheduled', makeup: true, students: [{ id: 'st3', code: 'AB-0200', name: 'سلمى' }] }),
];

function backend(lessons = LESSONS) {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/teachers' ? [teacher({ meeting_link: 'https://meet.example.org/x' }), teacher({ id: 't2', name: 'خالد', name_en: null })] : { date: '2026-10-12', lessons },
  );
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockParams = {};
  fakeNow(new Date('2026-10-12T15:10:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('today in Riyadh: one-line time, students over «kind · أ. teacher · length», ONE word per row, no button on a row', async () => {
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12');
  // The time and the names never wrap («11:00 / AM», owner screenshot 2026-10-29).
  expect(screen.getByText('18:00').props.numberOfLines).toBe(1);
  expect(screen.getByText('سلمى').props.numberOfLines).toBe(1);
  const teacher = t.today.teacherTitled.replace('{teacher}', 'أبرار محمد');
  // The kind leads, so a one-line cut takes the teacher's name, never «تجريبية».
  expect(screen.getByText(`${t.schedule.trialTag} · ${teacher} · ${t.enums.duration['30']}`)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${t.booking.makeup.tag} · `))).toBeTruthy();
  // The running (confirmed) lesson reads «جارية الآن» only; the other its short status.
  expect(screen.getByText(t.lessons.sheet.live)).toBeTruthy();
  expect(screen.queryByText(statusWord('confirmed'))).toBeNull();
  expect(screen.getByText(statusWord('scheduled'))).toBeTruthy();
  // «ادخل الحلقة» lives in the sheet, not on the row; no permissions note over the day.
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
  expect(screen.queryByText(t.sales.lessonActions.ownNote)).toBeNull();
  expect(screen.queryByRole('button', { name: t.lessons.rescheduleSubmit })).toBeNull();
});

test("never shows a teacher's fixed link (docs/16 row 14)", async () => {
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(screen.queryByText(/meet\.example\.org/)).toBeNull();
});

test('a teacher pill and the day arrows re-read the day', async () => {
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'خالد' }));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12&teacherId=t2');
  await fireEvent.press(screen.getByRole('button', { name: t.calendar.nextDay }));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-13&teacherId=t2');
});

test('opened on a teacher from «المعلمون»; an empty day says so', async () => {
  mockParams = { teacherId: 't1' };
  backend([]);
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText(t.sales.academySchedule.emptyTeacher)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12&teacherId=t1');
});

test('opened on a teacher further down the list: that pill comes right after «كل المعلمين», chosen', async () => {
  mockParams = { teacherId: 't2' };
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  const khaled = await screen.findByRole('tab', { name: 'خالد' });
  expect(khaled.props.accessibilityState).toMatchObject({ selected: true });
  const tabs = within(screen.getByLabelText(t.schedule.teacherFilter)).getAllByRole('tab');
  expect(tabs.map((tab) => within(tab).queryByText('خالد') !== null)).toEqual([false, true, false]);
});

test('under a status pill a running lesson still reads «جارية الآن»; the shared status word goes', async () => {
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  const s = t.sales.academySchedule.status;
  await fireEvent.press(await screen.findByRole('tab', { name: `${s.confirmed} 1` }));
  expect(screen.getByText(t.lessons.sheet.live)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: `${s.scheduled} 1` }));
  expect(screen.getByText('سلمى')).toBeTruthy();
  expect(screen.queryByText(statusWord('scheduled'))).toBeNull();
});

test('a running lesson still to confirm keeps «للتأكيد» under «جارية الآن» (screenshot 2026-10-29)', async () => {
  backend([scheduleLesson({ status: 'scheduled', trial: true })]);
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText(t.lessons.sheet.live)).toBeTruthy();
  expect(screen.getByText(statusWord('scheduled'))).toBeTruthy();
  const row = screen.getByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد') });
  expect(row.props.accessibilityHint).toContain(`${t.lessons.sheet.live} · ${t.enums.lessonStatus.scheduled}`);
});
