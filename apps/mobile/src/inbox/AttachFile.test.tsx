import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { Composer } from './Composer';
import { threadKey, threadMessages, type ThreadCache } from './thread-cache';
import { cachedThread, detail, message, PHONE, thread } from './thread-fixtures';
import { type ThreadMode, ThreadModeProvider } from './thread-mode';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: (...a: unknown[]) => mockUpload(...a) }) } },
}));
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const OPEN = { ...thread, last_inbound_at: minutesAgo(5) };
const CLOSED = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60) };
const attach = () => screen.queryByRole('button', { name: t.inbox.composer.attach });
const paperclip = () => screen.getByRole('button', { name: t.inbox.composer.attach });
const signed = { bucket: 'wa-media', path: 'out/u1/r1/x.jpg', token: 'tok', signed_url: 'https://s.test/up' };
const photo = { uri: 'file:///p.jpg', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/jpeg' };

async function show(th: typeof thread, mode: ThreadMode = { kind: 'admin' }) {
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([], { thread: th })));
  await renderWithQuery(
    <ThreadModeProvider value={mode}>
      <Composer phone={PHONE} thread={th} lessons={[]} />
    </ThreadModeProvider>,
    client,
  );
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ open: true, reason: null, queued: 0 });
  mockUpload.mockResolvedValue({ data: {}, error: null });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [photo] });
});

test('open window: the paperclip sends a photo, and its row joins the thread', async () => {
  const row = message({ id: 'sent', media_mime: 'image/jpeg', body: null });
  mockApiSend.mockResolvedValueOnce(signed).mockResolvedValueOnce(row);
  const client = await show(OPEN);
  await fireEvent.press(paperclip());
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attachImage }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockApiSend.mock.calls[0]?.[1]).toBe('/threads/%2B966552147730/file-upload-url');
  expect(mockApiSend.mock.calls[1]?.[1]).toBe('/threads/%2B966552147730/file');
  const sent = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(sent[0]).toBe(sent[1]);
  await waitFor(() =>
    expect(threadMessages(client.getQueryData<ThreadCache>(threadKey(PHONE))).map((m) => m.id)).toContain('sent'),
  );
});

test('a refusal shows inbox.error.<code> under the row', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(403, { code: 'files_forbidden' }));
  await show(OPEN);
  await fireEvent.press(paperclip());
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attachImage }));
  expect(await screen.findByText(t.inbox.error.files_forbidden)).toBeTruthy();
});

test('cancel closes the choice and sends nothing', async () => {
  await show(OPEN);
  await fireEvent.press(paperclip());
  await fireEvent.press(screen.getByText(t.common.cancel));
  expect(screen.queryByRole('button', { name: t.inbox.composer.attachPdf })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('hidden when the 24 h window is closed', async () => {
  await show(CLOSED);
  expect(attach()).toBeNull();
});

test('hidden in teacher mode (teachers do not send files)', async () => {
  await show(OPEN, { kind: 'teacher', teacherId: 't1' });
  expect(screen.getByRole('button', { name: t.inbox.composer.send })).toBeTruthy();
  expect(attach()).toBeNull();
});
