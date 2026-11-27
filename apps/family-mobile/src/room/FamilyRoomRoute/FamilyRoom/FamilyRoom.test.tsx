import { screen, waitFor } from '@testing-library/react-native';
import type * as Room from '@ab/mobile-kit/room';
import { Linking } from 'react-native';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { portalSend } from '@/portal';
import { lesson } from '@/portal/portal.fixtures';
import { FamilyRoom } from './FamilyRoom';

type ScreenProps = Parameters<typeof Room.RoomScreen>[0];

const mockAddListener = jest.fn((_event: string, _listener: () => void) => jest.fn());
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => false, push: jest.fn() },
  useNavigation: () => ({ addListener: mockAddListener }),
}));
const mockScreen = jest.fn((_props: ScreenProps) => null);
jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual<typeof Room>('@ab/mobile-kit/room'),
  useNativeRoom: () => ({ isPending: false, data: { name: 'livekit' } }),
  RoomScreen: (props: ScreenProps) => mockScreen(props),
}));
const mockAnswers: Record<string, unknown> = {};
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? ''] ?? {}),
}));

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';
const inRoom = [{ role: 'teacher' as const }];
const room = { liveSince: null, endedAt: null, inRoom };
const lastProps = () => mockScreen.mock.lastCall?.[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers[`/portal/students/${S}/lessons`] = {
    lessons: [lesson(new Date(), 5, { id: L, room })],
  };
});

test('LiveKit ready: the room for this lesson, with who the lesson says is inside', async () => {
  await renderWithQuery(
    <FamilyRoom link={{ studentId: S, lessonId: L, direct: true }} />,
    freshQueryClient(),
  );
  expect(screen.queryByTestId('room-sdk-failed')).toBeNull();
  expect(lastProps()?.target).toEqual({ kind: 'lesson', id: L });
  expect(lastProps()?.direct).toBe(true);
  await waitFor(() => expect(lastProps()?.presence).toEqual(inRoom));
});

test('the browser, the join again and leaving by back all go through the family portal', async () => {
  const url = 'https://join.example/room';
  const roomLink = jest.spyOn(portalSend, 'roomLink').mockResolvedValue({ url, expires_at: '' });
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const joined = { url: 'wss://lk.example', token: 'tk', room: 'r', role: 'guest' as const };
  const join = jest.spyOn(portalSend, 'join').mockResolvedValue(joined);
  await renderWithQuery(
    <FamilyRoom link={{ studentId: S, lessonId: L, direct: false }} />,
    freshQueryClient(),
  );
  const props = lastProps();
  props?.onBrowser?.();
  expect(roomLink).toHaveBeenCalledWith(expect.objectContaining({ studentId: S, lessonId: L }));
  const credentials = await props?.fetchJoin({ kind: 'lesson', id: L });
  expect(join).toHaveBeenCalledWith({ studentId: S, lessonId: L });
  expect(credentials).toEqual({ url: joined.url, token: 'tk', role: 'guest', chat: true });
  expect(openURL).toHaveBeenCalledWith(url);
  props?.backSource?.(() => undefined);
  expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
});
