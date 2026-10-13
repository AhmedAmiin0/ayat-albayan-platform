import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from './fixtures';
import { SalesScheduleScreen } from './SalesScheduleScreen';

const mockApiFetch = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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

test('today in Riyadh, read-only: time, students, teacher, status, trial / makeup; join only on the running lesson', async () => {
  backend();
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/schedule?date=2026-10-12');
  expect(screen.getByText('18:00')).toBeTruthy();
  expect(screen.getByText(t.schedule.trialTag)).toBeTruthy();
  expect(screen.getByText(t.booking.makeup.tag)).toBeTruthy();
  expect(screen.getByText(t.sales.academySchedule.liveNow)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
  expect(screen.getByText(t.sales.academySchedule.readOnly)).toBeTruthy();
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
