import { fireEvent, screen } from '@testing-library/react-native';
import type * as Room from '@ab/mobile-kit/room';
import { Linking } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { RoomRoute } from './RoomRoute';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: () => false, back: jest.fn(), push: jest.fn() },
  useNavigation: () => ({ addListener: jest.fn(() => () => undefined) }),
}));

let mockPending = false;
jest.mock('@ab/mobile-kit/room', () => {
  const actual = jest.requireActual<typeof Room>('@ab/mobile-kit/room');
  const pending = { isPending: true, data: undefined };
  return { ...actual, useNativeRoom: () => (mockPending ? pending : actual.useNativeRoom()) };
});

beforeEach(() => {
  mockPending = false;
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

const LESSON = { kind: 'lesson', id: '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10' } as const;
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const withInsets = (el: ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>{el}</SafeAreaProvider>
);

const mount = () => renderWithQuery(withInsets(<RoomRoute />), freshQueryClient());

test('LiveKit missing or failing to load (jest has none): its own line and «فتح في المتصفح»', async () => {
  mockParams = { kind: 'lesson', id: LESSON.id };
  await mount();
  expect(await screen.findByTestId('room-sdk-failed')).toBeTruthy();
  // Never the expiry line that sent the user round the same loop (#bug).
  expect(screen.queryByText(t.mobileRoom.missing)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.openInBrowser }));
  expect(Linking.openURL).toHaveBeenCalledWith(
    `https://app.ayatalbayan.com/classroom/${LESSON.id}`,
  );
});

test('a bad link: the expiry notice and «رجوع» only', async () => {
  mockParams = { kind: 'zoom', id: 'x' };
  await mount();
  expect(screen.getByText(t.mobileRoom.missing)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobileRoom.openInBrowser })).toBeNull();
  expect(screen.getByRole('button', { name: t.mobileRoom.back })).toBeTruthy();
});

test('while LiveKit loads: the connecting state, never its «not supported» line', async () => {
  mockParams = { kind: 'lesson', id: LESSON.id };
  mockPending = true;
  await mount();
  expect(screen.getByTestId('room-loading')).toBeTruthy();
  expect(screen.queryByTestId('room-sdk-failed')).toBeNull();
});
