import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson, yusuf } from '@/today/testing/fixtures';
import { TeacherScheduleScreen } from './TeacherScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T14:00:00Z') }));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
// What the API answers a teacher: no reschedule or admin cancel; the lesson started an hour ago.
const mine = lesson({ id: 'l1', status: 'confirmed', allowed_events: ['complete', 'mark_no_show'], students: [{ ...yusuf, report: null }] });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-01T14:00:00Z'), advanceTimers: true });
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return [mine];
    return [];
  });
});
afterEach(() => jest.useRealTimers());

test('a tap opens my lesson: no confirm, cancel, move or time edit; «ادخل الحلقة» and my report', async () => {
  await renderWithQuery(<TeacherScheduleScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد') }));
  expect(screen.getByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  for (const label of [t.today.confirm, t.today.cancel, t.lessons.rescheduleSubmit, t.editTime.action]) {
    expect(screen.queryByRole('button', { name: new RegExp(`^${label}`) })).toBeNull();
  }
  // The row's and the sheet's.
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(2);
  expect(screen.getByText(t.lessons.sheet.report.none)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.reports.open }));
  expect(router.push).toHaveBeenCalledWith('/teacher/reports/l1');
});
