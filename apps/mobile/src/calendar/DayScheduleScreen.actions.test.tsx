import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { DayScheduleScreen } from './DayScheduleScreen';
import { OVERVIEW, THIS_WEEK } from './overview-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === THIS_WEEK) return OVERVIEW;
    if (path.startsWith('/lessons/overview')) return { ...OVERVIEW, lessons: [] };
    if (path.startsWith('/booking/slots'))
      return { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [] };
    throw new ApiError(404);
  });
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

/** A row action is named with its students: «تأكيد — يوسف أحمد». */
const action = (label: string, who: string) =>
  screen.findByRole('button', { name: `${label} — ${who}` });

test('«تأكيد» is in view on the row: «مؤكدة» at once, then the confirm is sent', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await action(t.today.confirm, 'يوسف أحمد'));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  // يوسف's row says «مؤكدة» (with جنى's 17:00) before the server answers.
  await waitFor(() => expect(screen.getAllByText(t.enums.lessonStatus.confirmed)).toHaveLength(2));
  resolve({});
  expect(await screen.findByText(t.lessons.confirmed)).toBeTruthy();
});

test('«إلغاء» opens Today’s cancel form on the row', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await action(t.today.cancel, 'يوسف أحمد'));
  expect(screen.getByText(t.lessons.cancelBy)).toBeTruthy();
});

test('«غيّر الموعد» opens the reschedule sheet over «الجدول»', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await action(t.lessons.rescheduleSubmit, 'يوسف أحمد'));
  await waitFor(() =>
    expect(screen.getByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy(),
  );
});

test('a held lesson has no confirm / cancel / reschedule, only «أرسل طلب الرأي»', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await screen.findByText('جودى خالد');
  for (const label of [t.today.confirm, t.today.cancel, t.lessons.rescheduleSubmit]) {
    expect(screen.queryByRole('button', { name: `${label} — جودى خالد` })).toBeNull();
  }
  expect(screen.getByRole('button', { name: t.mobile.feedback.sendFor.replace('{name}', 'جودى خالد') })).toBeTruthy();
});
