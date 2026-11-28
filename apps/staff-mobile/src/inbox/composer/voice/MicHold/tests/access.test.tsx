import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { t } from '@ab/mobile-kit';
import { hold, lift, openChat, rec, resetVoice, tick } from '@/inbox/composer/voice/voice-test-kit';
import type * as mockVoiceTestKit from '@/inbox/composer/voice/voice-test-kit';

// A screen reader's tap, the bin, leaving the app and a call (RTL).
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
let mockInCall = false;
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-audio', () => jest.requireActual<typeof mockVoiceTestKit>('@/inbox/composer/voice/voice-test-kit').audioMock());
jest.mock('@/inbox/composer/voice/voice-support', () => ({ voiceSupported: () => true }));
jest.mock('@/inbox/thread/calls/state/call-context', () => ({
  ...jest.requireActual('@/inbox/thread/calls/state/call-context'),
  useCalls: () => (mockInCall ? { busy: true, call: jest.fn(), config: {} } : null),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const mic = () => screen.getByRole('button', { name: t.inbox.composer.voice.record });

beforeEach(() => {
  resetVoice();
  mockInCall = false;
  mockApiSend.mockReset();
});

test('a screen reader’s «activate» records locked (no hold), announced; the bin discards it', async () => {
  const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await openChat(mockApiFetch);
  await act(async () => {
    await fireEvent(mic(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  });
  expect(rec.record).toHaveBeenCalled();
  expect(say).toHaveBeenCalledWith(t.inbox.composer.voice.locked);
  expect(screen.getByRole('button', { name: t.inbox.composer.voice.delete })).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.voice.delete }));
  });
  expect(say).toHaveBeenCalledWith(t.inbox.composer.voice.cancelled);
  expect(screen.queryByTestId('recording-bar')).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the app leaving the foreground stops and keeps the recording (delete or send), sends nothing', async () => {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  });
  await openChat(mockApiFetch);
  await hold();
  tick(5000);
  await act(async () => listeners.forEach((fn) => fn('background')));
  expect(rec.stop).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: t.inbox.composer.voice.delete })).toBeTruthy();
  expect(screen.queryByTestId('rec-dot')).toBeNull(); // kept, no longer recording
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the app leaving while the recorder gets ready: no recording goes live, a later tap sends nothing', async () => {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  });
  let ready: () => void = () => undefined;
  rec.prepareToRecordAsync.mockImplementationOnce(
    () => new Promise<undefined>((resolve) => (ready = () => resolve(undefined))),
  );
  await openChat(mockApiFetch);
  await hold(); // the recorder is still getting ready
  await act(async () => listeners.forEach((fn) => fn('background')));
  await act(async () => ready());
  expect(rec.stop).toHaveBeenCalled();
  expect(screen.queryByTestId('rec-dot')).toBeNull();
  expect(screen.queryByTestId('recording-bar')).toBeNull();
  await lift();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('during a call there is no microphone: the round button is «أرسل»', async () => {
  mockInCall = true;
  await openChat(mockApiFetch);
  expect(screen.queryByRole('button', { name: t.inbox.composer.voice.record })).toBeNull();
  expect(screen.getByRole('button', { name: t.inbox.composer.send })).toBeTruthy();
});

test('typing turns the microphone into «أرسل»', async () => {
  await openChat(mockApiFetch);
  expect(mic()).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.placeholder), 'السلام عليكم');
  expect(screen.queryByRole('button', { name: t.inbox.composer.voice.record })).toBeNull();
  expect(screen.getByRole('button', { name: t.inbox.composer.send })).toBeTruthy();
});
