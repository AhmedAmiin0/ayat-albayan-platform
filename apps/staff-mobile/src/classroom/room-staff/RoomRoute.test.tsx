import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { LESSON, withInsets } from '@/classroom/room/state/room-test-kit';
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
