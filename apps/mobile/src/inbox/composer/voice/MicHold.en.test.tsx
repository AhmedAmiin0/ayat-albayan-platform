import en from '@ab/shared/i18n/en.json';
import { screen, waitFor } from '@testing-library/react-native';
import { hold, lift, moveTo, openChat, rec, resetVoice, tick } from './voice-test-kit';

// An English phone (LTR): the start is on the LEFT, so the slide to cancel goes left (dx < 0).
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
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('expo-audio', () => jest.requireActual<typeof import('./voice-test-kit')>('./voice-test-kit').audioMock());
jest.mock('./voice-support', () => ({ voiceSupported: () => true }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const voice = en.inbox.composer.voice;

beforeEach(() => {
  resetVoice();
  mockApiSend.mockReset();
});

test('the round button is the microphone, labelled in English, while the box is empty', async () => {
  await openChat(mockApiFetch);
  expect(screen.getByRole('button', { name: voice.record }).props.accessibilityHint).toBe(voice.hint);
  expect(screen.getByTestId('mic-circle')).toBeTruthy();
});

test('slide left (dx < 0) past the line cancels; nothing sent', async () => {
  await openChat(mockApiFetch);
  await hold(500);
  expect(screen.getByText(voice.slideCancel)).toBeTruthy();
  await moveTo(500 - 400);
  expect(screen.queryByTestId('recording-bar')).toBeNull();
  expect(rec.stop).toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('slide right (toward the end) never cancels: the lift sends', async () => {
  mockApiSend.mockResolvedValueOnce({ bucket: 'wa-media', path: 'out/u1/r1/a.m4a', token: 't', signed_url: 'u' }).mockResolvedValueOnce({ id: 'v1' });
  await openChat(mockApiFetch);
  await hold(100);
  await moveTo(100 + 400);
  expect(screen.getByTestId('recording-bar')).toBeTruthy();
  tick(2000);
  await lift();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
});

test('slide up locks in English too: «Delete recording» and «Send»', async () => {
  await openChat(mockApiFetch);
  await hold(300, 500);
  await moveTo(300, 380);
  expect(screen.getByRole('button', { name: voice.delete })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.inbox.composer.send })).toBeTruthy();
});
