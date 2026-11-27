import type { ChannelSeat } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { SalesChannelScreen } from './SalesChannelScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

// Any assistant may take a chat's seat, one at a time, and the one who brought the student
// has priority: the assistant's chat screen reads the seat first.
const S = t.studentChannel.seat;
const SEAT = '/sales/students/s1/channel/seat';
const free: ChannelSeat = { holder: null, mine: false, bringer: false, canTake: true };

/** The seat answers; the thread itself stays loading (only the seat is under test). */
const seatIs = (seat: ChannelSeat) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path === SEAT ? seat : new Promise(() => undefined),
  );

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('held by another assistant: a calm card with her name, nothing to take', async () => {
  seatIs({ ...free, holder: { id: 'p-b', name: 'هدى' }, canTake: false });
  await renderWithQuery(<SalesChannelScreen />);
  expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
  expect(screen.queryByText(S.take)).toBeNull();
});

test('free: «تولَّ المحادثة» sends PUT; taken first by another (409) says so', async () => {
  seatIs(free);
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'channel_seat_taken' }));
  await renderWithQuery(<SalesChannelScreen />);
  expect(await screen.findByText(S.takeHint)).toBeTruthy();
  await fireEvent.press(screen.getByText(S.take));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', SEAT, undefined));
  expect(await screen.findByText(S.taken)).toBeTruthy();
});

test('my own student, held by a colleague: her name, and «انقل المحادثة إليك» sends PUT', async () => {
  seatIs({ holder: { id: 'p-b', name: 'هدى' }, mine: false, bringer: true, canTake: true });
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<SalesChannelScreen />);
  expect(await screen.findByText(S.takeOverHint.replace('{name}', 'هدى'))).toBeTruthy();
  await fireEvent.press(screen.getByText(S.takeOver));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', SEAT, undefined));
});

test('mine: the chat with «مغادرة المحادثة» in its header, which frees the seat', async () => {
  seatIs({ holder: { id: 'p-a', name: 'سارة' }, mine: true, bringer: true, canTake: false });
  mockApiSend.mockResolvedValue(undefined);
  await renderWithQuery(<SalesChannelScreen />);
  await fireEvent.press(await screen.findByText(S.leave));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('DELETE', SEAT, undefined));
});
