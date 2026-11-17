import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { RoomRoute } from './RoomRoute';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: () => false, back: jest.fn(), push: jest.fn() },
  useNavigation: () => ({ addListener: jest.fn(() => () => undefined) }),
}));

beforeEach(() => jest.spyOn(Linking, 'openURL').mockResolvedValue(true));

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
  expect(screen.getByTestId('room-sdk-failed')).toBeTruthy();
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
