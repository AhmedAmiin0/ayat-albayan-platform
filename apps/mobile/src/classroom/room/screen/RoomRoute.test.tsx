import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { LESSON, withInsets } from '@/classroom/room/state/room-test-kit';
import { t } from '@/core/lib/i18n/i18n';
import { RoomRoute } from './RoomRoute';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: () => false, back: jest.fn() },
}));

beforeEach(() => jest.spyOn(Linking, 'openURL').mockResolvedValue(true));

test('a binary without LiveKit (jest has none): a notice, «فتح في المتصفح», never a crash', async () => {
  mockParams = { kind: 'lesson', id: LESSON.id };
  await render(withInsets(<RoomRoute />));
  expect(screen.getByTestId('room-unavailable')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.openInBrowser }));
  expect(Linking.openURL).toHaveBeenCalledWith(
    `https://app.ayatalbayan.com/classroom/${LESSON.id}`,
  );
});

test('a bad link: the notice and «رجوع» only', async () => {
  mockParams = { kind: 'zoom', id: 'x' };
  await render(withInsets(<RoomRoute />));
  expect(screen.queryByRole('button', { name: t.mobileRoom.openInBrowser })).toBeNull();
  expect(screen.getByRole('button', { name: t.mobileRoom.back })).toBeTruthy();
});
