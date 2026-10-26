import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { DayScheduleScreen } from './DayScheduleScreen';
import { OVERVIEW, THIS_WEEK } from '../overview/overview-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === THIS_WEEK) return OVERVIEW;
    if (path.startsWith('/lessons/overview')) return { ...OVERVIEW, lessons: [] };
    throw new ApiError(404);
  });
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

const openRow = (who: string) => screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', who) });
const sheetOpen = () => screen.queryByText(t.lessons.sheet.about) !== null;

test('a tap on the row opens «تفاصيل الحلقة» with the admin’s actions for that lesson', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await openRow('يوسف أحمد'));
  expect(screen.getByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.getByText(t.lessons.sheet.about)).toBeTruthy();
  expect(screen.getByText(new RegExp(`16:00 ${t.schedule.riyadhTime}$`))).toBeTruthy();
  // Row and sheet both offer them now: the sheet is a full lesson view.
  for (const label of [t.today.confirm, t.today.cancel, t.lessons.rescheduleSubmit]) {
    expect(screen.getAllByRole('button', { name: `${label} — يوسف أحمد` })).toHaveLength(2);
  }
});

test('a row’s own button fires its action and does not open the sheet', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${t.today.confirm} — يوسف أحمد` }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  expect(sheetOpen()).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: `${t.today.cancel} — جنى وليد` }));
  expect(screen.getByText(t.lessons.cancelBy)).toBeTruthy();
  expect(sheetOpen()).toBe(false);
});

test('«تأكيد» inside the sheet confirms, and the sheet shows the new status at once', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await openRow('يوسف أحمد'));
  const [, inSheet] = screen.getAllByRole('button', { name: `${t.today.confirm} — يوسف أحمد` });
  if (!inSheet) throw new Error('no sheet confirm');
  await fireEvent.press(inSheet);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  // يوسف (row + sheet) and جنى's 17:00 read «مؤكدة».
  await waitFor(() => expect(screen.getAllByText(t.enums.lessonStatus.confirmed)).toHaveLength(3));
});

test('«غيّر الميعاد» from the sheet opens the reschedule sheet over it; «إغلاق» closes the details', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === THIS_WEEK) return OVERVIEW;
    if (path.startsWith('/booking/slots')) return { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [] };
    throw new ApiError(404);
  });
  await renderWithQuery(<DayScheduleScreen />);
  await fireEvent.press(await openRow('يوسف أحمد'));
  const [, inSheet] = screen.getAllByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` });
  if (!inSheet) throw new Error('no sheet reschedule');
  await fireEvent.press(inSheet);
  await waitFor(() => expect(screen.getByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy());
  const closes = screen.getAllByRole('button', { name: t.common.close });
  const first = closes[0];
  if (!first) throw new Error('no close');
  await fireEvent.press(first);
  await waitFor(() => expect(sheetOpen()).toBe(false));
});
