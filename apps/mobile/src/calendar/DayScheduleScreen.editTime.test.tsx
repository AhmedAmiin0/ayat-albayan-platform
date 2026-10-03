import { fireEvent, screen } from '@testing-library/react-native';
import { GRID } from '@/edit-time/fixtures';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { DayScheduleScreen } from './DayScheduleScreen';
import { OVERVIEW, THIS_WEEK } from './overview-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  // The API offers «عدّل الوقت» on the pending lesson only (an admin's `move`).
  const lessons = OVERVIEW.lessons.map((l) => (l.id === 'l-pending' ? { ...l, time_edit_mode: 'move' } : l));
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === THIS_WEEK) return { ...OVERVIEW, lessons };
    if (path.startsWith('/lessons/overview')) return { ...OVERVIEW, lessons: [] };
    if (path.startsWith('/booking/slots')) return GRID;
    throw new ApiError(404);
  });
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('«عدّل الوقت» sits beside «غيّر الميعاد» on the row that allows it and opens the sheet over «الجدول»', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  const edit = await screen.findByRole('button', { name: `${t.editTime.action} — يوسف أحمد` });
  expect(screen.getAllByRole('button', { name: new RegExp(t.editTime.action) })).toHaveLength(1);
  await fireEvent.press(edit);
  expect(await screen.findByRole('header', { name: t.editTime.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByRole('header', { name: t.editTime.title })).toBeNull();
});
