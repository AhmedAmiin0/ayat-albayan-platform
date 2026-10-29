import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { Composer } from '../Composer';
import { threadKey } from '../../thread/hooks/thread-cache';
import { cachedThread, detail, PHONE, thread } from '../../shared/thread-fixtures';
import { type ThreadMode, ThreadModeProvider } from '../../thread/hooks/thread-mode';

// The pill: the emoji and camera in the bar as WhatsApp (owner 2026-10-29) and as tiles of the paperclip's sheet, and the teacher's own pill.
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({ open: true, reason: null, queued: 0 })),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const OPEN = { ...thread, last_inbound_at: new Date(Date.now() - 5 * 60_000).toISOString() };
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const tile = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attach }));
  await fireEvent.press(within(screen.getByTestId('attach-sheet')).getByRole('button', { name }));
};

async function show(mode: ThreadMode = { kind: 'admin' }) {
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([], { thread: OPEN })));
  await renderWithQuery(
    <ThreadModeProvider value={mode}>
      <Composer phone={PHONE} thread={OPEN} lessons={[]} />
    </ThreadModeProvider>,
    client,
  );
}

beforeEach(() => jest.clearAllMocks());

test('the emoji tile: an emoji goes in at the caret; the sheet stays open for more, «تم» closes it', async () => {
  await show();
  await fireEvent.changeText(box(), 'السلام عليكم');
  await fireEvent(box(), 'selectionChange', { nativeEvent: { selection: { start: 6, end: 6 } } });
  expect(screen.getByRole('button', { name: t.inbox.composer.emoji })).toBeTruthy(); // in the bar too
  await tile(t.inbox.composer.emoji);
  expect(screen.queryByTestId('attach-sheet')).toBeNull();
  const sheet = screen.getByTestId('emoji-sheet');
  await fireEvent.press(within(sheet).getByRole('button', { name: '🌹' }));
  expect(box().props.value).toBe('السلام🌹 عليكم');
  await fireEvent.press(within(sheet).getByRole('button', { name: '😊' }));
  expect(box().props.value).toBe('السلام🌹😊 عليكم');
  await fireEvent.press(within(sheet).getByRole('button', { name: t.inbox.composer.emojiDone }));
  expect(screen.queryByTestId('emoji-sheet')).toBeNull();
});

test('the camera tile sends a photo taken now', async () => {
  mockApiSend.mockResolvedValueOnce({ bucket: 'wa-media', path: 'out/u/r/x.jpg', token: 't', signed_url: 'u' }).mockResolvedValueOnce({ id: 'p1' });
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///c.jpg', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
  } as never);
  await show();
  await tile(t.inbox.composer.camera);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({ mime: 'image/jpeg' });
});

test('staff bar as WhatsApp: the emoji opens its sheet; the camera beside the paperclip sends a photo and hides while typing', async () => {
  mockApiSend.mockResolvedValueOnce({ bucket: 'wa-media', path: 'out/u/r/y.jpg', token: 't', signed_url: 'u' }).mockResolvedValueOnce({ id: 'p2' });
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///d.jpg', width: 1, height: 1, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
  } as never);
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.emoji }));
  expect(screen.getByTestId('emoji-sheet')).toBeTruthy();
  await fireEvent.press(within(screen.getByTestId('emoji-sheet')).getByRole('button', { name: t.inbox.composer.emojiDone }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.camera }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  await fireEvent.changeText(box(), 'مرحبا');
  expect(screen.queryByRole('button', { name: t.inbox.composer.camera })).toBeNull();
});

test('teacher: [emoji][text][قالب]; no paperclip, camera or microphone; «أرسل» waits for text', async () => {
  await show({ kind: 'teacher', teacherId: 't1' });
  expect(screen.getByRole('button', { name: t.inbox.composer.emoji })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.inbox.composer.sendTemplate })).toBeTruthy();
  for (const name of [t.inbox.composer.attach, t.inbox.composer.camera, t.inbox.composer.voice.record]) {
    expect(screen.queryByRole('button', { name })).toBeNull();
  }
  const send = () => screen.getByRole('button', { name: t.inbox.composer.send });
  expect(send().props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.changeText(box(), 'أحسنت');
  expect(send().props.accessibilityState).toMatchObject({ disabled: false });
});
