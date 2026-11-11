import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherScheduleScreen } from './TeacherScheduleScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// An hour before the fixture lesson's 13:00Z start.
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T12:00:00Z') }));

const w = t.teacherBoard;
const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
const ahead = lesson({ id: 'l1', status: 'confirmed' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-01T12:00:00Z'), advanceTimers: true });
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return [ahead];
    return [];
  });
});
afterEach(() => jest.useRealTimers());

const openSheet = async () =>
  fireEvent.press(
    await screen.findByRole('button', {
      name: t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد'),
    }),
  );

test('«تفاصيل الحلقة» of a lesson ahead: «سأحضر» posts confirm-attendance and says so', async () => {
  mockApiSend.mockResolvedValue({ ...ahead, teacher_confirmed_at: '2026-10-01T12:00:00Z' });
  await renderWithQuery(<TeacherScheduleScreen />);
  await openSheet();
  expect(screen.queryByRole('button', { name: t.today.confirm })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: w.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith(
      'POST',
      '/teachers/me/lessons/l1/confirm-attendance',
      undefined,
    ),
  );
  expect(await screen.findByText(w.confirmedOk)).toBeTruthy();
});

test('«إلغاء الحلقة» in the sheet: the reason form, then the teacher route', async () => {
  mockApiSend.mockResolvedValue({ ...ahead, status: 'cancelled_by_teacher' });
  await renderWithQuery(<TeacherScheduleScreen />);
  await openSheet();
  await fireEvent.press(screen.getByRole('button', { name: w.cancel }));
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/l1/cancel', {
      reason: 'سفر',
    }),
  );
  expect(await screen.findByText(w.cancelledOk)).toBeTruthy();
});
