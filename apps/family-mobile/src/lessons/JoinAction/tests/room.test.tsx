import { PUBLIC_CONFIG_QUERY_KEY, PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, Vibration } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '@/portal/portal.fixtures';
import { JoinAction } from '@/lessons/JoinAction/JoinAction';

// «ادخل الحلقة» inside the app (owner 2026-11-16): our classroom while
// settings.family_meetings_in_app is on and LiveKit is in the binary; else the browser as before.

const mockSend = jest.fn();
const mockHandOff = jest.fn();
let mockNative: object | null = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));
jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual('@ab/mobile-kit/room'),
  liveKitNative: () => mockNative,
  handOff: (...args: unknown[]) => mockHandOff(...args),
}));

const now = new Date('2026-11-15T15:25:00.000Z');
const JOIN = { url: 'wss://lk', token: 'tok', room: 'r1', role: 'guest' };
const LINK = { url: 'https://app.example/join/tok', expires_at: now.toISOString() };

async function press(over: Parameters<typeof lesson>[2], inApp: boolean) {
  const client = freshQueryClient();
  const config = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, family_meetings_in_app: inApp };
  client.setQueryData(PUBLIC_CONFIG_QUERY_KEY, config);
  const l = lesson(now, 5, over);
  await renderWithQuery(<JoinAction lesson={l} student={student()} now={now} />, client);
  await fireEvent.press(screen.getByRole('button', { name: t.portal.join }));
  return l;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNative = {};
  mockSend.mockImplementation(async (_m: string, path: string) =>
    path.endsWith('/join') ? JOIN : LINK,
  );
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
});

test('setting on: joins, hands the token to the room and opens it in the app', async () => {
  const l = await press({}, true);
  const s = student();
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith(`/room/${l.id}?student=${s.id}`),
  );
  expect(mockHandOff).toHaveBeenCalledWith({ kind: 'lesson', id: l.id }, JOIN);
  expect(Linking.openURL).not.toHaveBeenCalled();
});

test('setting off: the signed link in the browser, as before', async () => {
  await press({}, false);
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(LINK.url));
  expect(router.push).not.toHaveBeenCalled();
});

test('a Meet lesson opens its own link even with the setting on', async () => {
  await press({ way_in: 'external', meeting_url: 'https://meet.example/abc' }, true);
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://meet.example/abc'));
  expect(mockSend).not.toHaveBeenCalled();
});

test('no LiveKit in this binary: the browser link even with the setting on', async () => {
  mockNative = null;
  await press({}, true);
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(LINK.url));
});
