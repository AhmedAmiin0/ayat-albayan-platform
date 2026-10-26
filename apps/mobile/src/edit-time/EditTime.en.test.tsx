import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { EditTimeSheet } from './components/EditTimeSheet';
import { GRID, NOW, SAT_17, SUN_17, held, result, upcoming } from './testing/fixtures';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(GRID);
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('a move reads in English: the change line, the teacher’s clock, the guardian toggle, the saved note', async () => {
  mockApiSend.mockResolvedValue(result({ notified: 1 }));
  await renderWithQuery(<EditTimeSheet lesson={upcoming} onClose={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'Edit lesson time' })).toBeTruthy();
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  expect(
    screen.getByText('Sunday 4 October 17:00 · 45 minutes ← Saturday 3 October 17:00 · 45 minutes'),
  ).toBeTruthy();
  expect(screen.getByText('Teacher: 17:00 Cairo time')).toBeTruthy();
  expect(screen.getByRole('switch', { name: 'Send the guardian a confirmation of the new time' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Save the change' }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-up/time', {
    expectedStartsAt: SUN_17,
    expectedEndsAt: upcoming.ends_at,
    startsAt: SAT_17,
    durationMin: 45,
    notify: true,
  });
  expect(await screen.findByText('The time was updated')).toBeTruthy();
  expect(screen.getByText('The guardian is sent a WhatsApp confirmation of the new time')).toBeTruthy();
});

test('a correction reads in English, its reason marked required', async () => {
  await renderWithQuery(<EditTimeSheet lesson={held} onClose={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'Correct lesson time' })).toBeTruthy();
  expect(screen.getByText('Day: Thursday 1 October (a correction stays on the same day)')).toBeTruthy();
  expect(screen.getByText('Reason *')).toBeTruthy();
});
