import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, message, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

// A photo sent while answering a message goes with replyToMessageId (owner 2026-10-25 «رد»).

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
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const asked = message({ id: 'm1', direction: 'inbound', status: 'delivered', body: 'أرسلي صورة الإيصال', replyable: true, created_at: minutesAgo(9) });
const signed = { bucket: 'wa-media', path: 'out/u1/r1/x.jpg', token: 'tok', signed_url: 'https://s.test/up' };
const photo = { uri: 'file:///p.jpg', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/jpeg' };

async function answerWithPhoto() {
  const data = detail([asked], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
  mockApiFetch.mockImplementation(async (path: string) => (path === '/messages/gate' ? { open: true, reason: null, queued: 0 } : data));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await fireEvent(await screen.findByTestId('bubble-m1'), 'longPress');
  await fireEvent.press(within(screen.getByTestId('message-menu')).getByRole('button', { name: t.inbox.reply.action }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attach }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.gallery }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [photo] });
});

test('the file goes with replyToMessageId, and the strip clears once it is sent', async () => {
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce(message({ id: 'sent', media_mime: 'image/jpeg', body: null }));
  await answerWithPhoto();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockApiSend.mock.calls[1]?.[2]).toMatchObject({ path: signed.path, replyToMessageId: 'm1' });
  expect(mockApiSend.mock.calls[0]?.[2]).not.toHaveProperty('replyToMessageId');
  await waitFor(() => expect(screen.queryByTestId('reply-strip')).toBeNull());
});

test('a refused file keeps the strip', async () => {
  mockApiSend.mockResolvedValueOnce(signed).mockRejectedValueOnce(new ApiError(400, { code: 'reply_not_in_thread' }));
  await answerWithPhoto();
  expect(await screen.findByText(t.inbox.error.reply_not_in_thread)).toBeTruthy();
  expect(screen.getByTestId('reply-strip')).toBeTruthy();
});
