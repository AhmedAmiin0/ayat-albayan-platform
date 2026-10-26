import { fireEvent, screen } from '@testing-library/react-native';
import { GRID, held } from '@/edit-time/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { pending } from './testing/fixtures';
import { TodayScreen } from './screens/TodayScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

function serve(day: unknown[]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/lessons/day')) return day;
    if (path.startsWith('/booking/slots')) return GRID;
    return null;
  });
}
const edit = (who: string) => ({ name: `${t.editTime.action} — ${who}` });

test('the sheet of an open lesson offers «عدّل الوقت» beside «غيّر الموعد»; it opens the edit sheet', async () => {
  serve([{ ...pending, time_edit_mode: 'move' }]);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  expect(screen.getByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', edit('يوسف أحمد')));
  expect(await screen.findByRole('header', { name: t.editTime.title })).toBeTruthy();
});

test('an ended lesson, unfolded, opens its sheet and the correction (R-SCH-11)', async () => {
  serve([held]);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: 'انتهت حلقة واحدة اليوم' }));
  await fireEvent.press(screen.getByRole('button', { name: /^10:00، جودى خالد/ }));
  await fireEvent.press(await screen.findByRole('button', edit('جودى خالد')));
  expect(await screen.findByRole('header', { name: t.editTime.correctTitle })).toBeTruthy();
});

test('without the API’s mode (a cache from before) the sheet has no «عدّل الوقت»', async () => {
  serve([pending]);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  await screen.findByRole('header', { name: 'يوسف أحمد' });
  expect(screen.queryByRole('button', edit('يوسف أحمد'))).toBeNull();
});
