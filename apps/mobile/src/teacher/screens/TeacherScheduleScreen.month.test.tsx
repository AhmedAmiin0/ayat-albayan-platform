import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherScheduleScreen } from './TeacherScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T09:00:00Z') }));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
// Thursday 1 October (today) and Thursday 15 October, both mid-morning in Riyadh.
const today = lesson({ id: 'l1', allowed_events: ['confirm'] });
const later = lesson({
  id: 'l2',
  starts_at: '2026-10-15T09:00:00.000Z',
  ends_at: '2026-10-15T09:45:00.000Z',
  students: [{ ...today.students[0], id: 's9', name: 'ريم سالم' } as (typeof today.students)[number]],
});

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return [today, later];
    return [];
  });
});

const lessonsCalls = () =>
  mockApiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.startsWith('/teachers/me/lessons'));

test('«الشهر»: one read of the whole grid, today picked; another day lists its lessons', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  await fireEvent.press(await screen.findByText(t.teacherSchedule.month));
  // October 2026 opens on Saturday 26 September and ends on Friday 6 November, in Riyadh.
  expect(lessonsCalls().at(-1)).toBe(
    '/teachers/me/lessons?from=2026-09-25T21%3A00%3A00.000Z&to=2026-11-06T21%3A00%3A00.000Z',
  );
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(screen.queryByText('ريم سالم')).toBeNull();
  await fireEvent.press(screen.getByLabelText(/15 أكتوبر/));
  expect(await screen.findByText('ريم سالم')).toBeTruthy();
  expect(screen.queryByText('يوسف أحمد')).toBeNull();
});

test('‹ › moves a month; «اليوم» comes back', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  await fireEvent.press(await screen.findByText(t.teacherSchedule.month));
  await fireEvent.press(screen.getByRole('button', { name: t.teacherSchedule.nextMonth }));
  expect(lessonsCalls().at(-1)).toContain('from=2026-10-30T21');
  await fireEvent.press(screen.getByText(t.schedule.today));
  expect(lessonsCalls().at(-1)).toContain('from=2026-09-25T21');
});

test('the header opens «المواعيد المتاحة»', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  await fireEvent.press(await screen.findByText(t.availability.title));
  expect(router.push).toHaveBeenCalledWith('/teacher/more/availability');
});
