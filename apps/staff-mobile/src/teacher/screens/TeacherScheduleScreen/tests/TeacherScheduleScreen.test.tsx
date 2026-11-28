import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { answered } from '@/today/testing/answered';
import { TeacherScheduleScreen } from '@/teacher/screens/TeacherScheduleScreen/TeacherScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({ ...jest.requireActual('@ab/mobile-kit/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T09:00:00Z') }));

const TEACHER = '00000000-0000-4000-8000-0000000000a1';
const me = {
  id: TEACHER,
  display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo',
  meeting_link: null, meeting_mode: null,
  students: [],
};
// What the API answers a teacher: no `reschedule` or admin cancel among her lesson's events.
const mine = answered(lesson({ id: 'l1', allowed_events: ['confirm'] }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return [mine];
    return [{ id: 'a1', weekday: 4, start_time: '16:00', end_time: '20:00', tz: 'Africa/Cairo' }];
  });
});

test('my Riyadh week from /teachers/me/lessons, my availability, and no «غيّر الموعد»', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/teachers/me/lessons?from=2026-09-25T21%3A00%3A00.000Z&to=2026-10-02T21%3A00%3A00.000Z',
  );
  expect(mockApiFetch).toHaveBeenCalledWith(`/teachers/${TEACHER}/availability`);
  expect(mockApiFetch.mock.calls.some(([p]) => String(p).startsWith('/lessons'))).toBe(false);
  expect(screen.getByRole('header', { name: t.teacherNav.calendar })).toBeTruthy();
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(screen.queryByText(t.lessons.rescheduleSubmit)).toBeNull();
});

test('‹ › moves a week: the next week is asked for, and an empty week says so', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  await screen.findByText('يوسف أحمد');
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextWeek }));
  expect(await screen.findByText(t.teacherDash.noLessonsWeek)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/teachers/me/lessons?from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z',
  );
});
