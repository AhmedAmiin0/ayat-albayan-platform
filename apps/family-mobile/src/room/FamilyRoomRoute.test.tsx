import { screen } from '@testing-library/react-native';
import type * as Room from '@ab/mobile-kit/room';
import { useLocalSearchParams } from 'expo-router';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { FamilyRoomRoute } from './FamilyRoomRoute';

// app/room/[id]: never a crash where the room cannot start (jest has no LiveKit module).

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));

let mockPending = false;
jest.mock('@ab/mobile-kit/room', () => {
  const actual = jest.requireActual<typeof Room>('@ab/mobile-kit/room');
  const pending = { isPending: true, data: undefined };
  return { ...actual, useNativeRoom: () => (mockPending ? pending : actual.useNativeRoom()) };
});

beforeEach(() => (mockPending = false));

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';
const params = jest.mocked(useLocalSearchParams);

test('a bad or stale link: «الرابط غير صالح» notice, no room', async () => {
  params.mockReturnValue({ id: 'nope' });
  await renderWithQuery(<FamilyRoomRoute />, freshQueryClient());
  expect(screen.getByTestId('room-unavailable')).toBeTruthy();
  expect(screen.queryByTestId('room-screen')).toBeNull();
});

test('no LiveKit in this binary: the notice with «فتح في المتصفح»', async () => {
  params.mockReturnValue({ id: L, student: S });
  await renderWithQuery(<FamilyRoomRoute />, freshQueryClient());
  expect(await screen.findByTestId('room-sdk-failed')).toBeTruthy();
});

test('while LiveKit loads: the connecting state, never «not supported»', async () => {
  params.mockReturnValue({ id: L, student: S });
  mockPending = true;
  await renderWithQuery(<FamilyRoomRoute />, freshQueryClient());
  expect(screen.getByTestId('room-loading')).toBeTruthy();
  expect(screen.queryByTestId('room-sdk-failed')).toBeNull();
});
