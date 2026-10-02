import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/fixtures';
import { TeacherScheduleScreen } from './TeacherScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/today/use-day-lessons', () => ({ useNow: () => new Date('2026-10-01T09:00:00Z') }));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
// What the API answers a teacher: no `reschedule` or admin cancel among her lesson's events.
const mine = lesson({ id: 'l1', allowed_events: ['confirm'] });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return [mine];
    return [{ id: 'a1', weekday: 4, start_time: '16:00', end_time: '20:00', tz: 'Africa/Cairo' }];
  });
});

test('my Riyadh week from /teachers/me/lessons, my availability, and no «غيّر الميعاد»', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/teachers/me/lessons?from=2026-09-25T21%3A00%3A00.000Z&to=2026-10-02T21%3A00%3A00.000Z',
  );
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/t-abrar/availability');
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
