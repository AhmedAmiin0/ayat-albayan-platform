import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { type ThreadMode, ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { StickerFavourite } from './StickerFavourite';

// «أضف إلى المفضلة» on a sticker bubble (owner 2026-11-01).
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const M1 = 'b1111111-1111-4111-8111-111111111111';
const payload = { type: 'sticker', sticker: { sha256: 'abc=' } };
const sticker = message({ id: M1, media_mime: 'image/webp', interactive_payload: payload });
const listOf = (favourites: object[]) => ({ favourites, recent: [] });

const show = (m = sticker, mode: ThreadMode = { kind: 'admin' }, onClose = jest.fn()) =>
  renderWithQuery(
    <ThreadModeProvider value={mode}>
      <StickerFavourite message={m} onClose={onClose} />
    </ThreadModeProvider>,
  );

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue(undefined);
});

test('a sticker not yet saved: «أضف إلى المفضلة» saves it and closes the menu', async () => {
  mockApiFetch.mockResolvedValue(listOf([]));
  const onClose = jest.fn();
  await show(sticker, { kind: 'admin' }, onClose);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.sticker.favourite }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', '/threads/stickers/favourites', { messageId: M1 }));
  expect(onClose).toHaveBeenCalled();
});

test('a saved sticker (same sha256): «أزل من المفضلة» drops it', async () => {
  mockApiFetch.mockResolvedValue(listOf([{ message_id: 'other', phone: PHONE, key: 'sha:abc=' }]));
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.sticker.unfavourite }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('DELETE', `/threads/stickers/favourites/${M1}`));
});

test('nothing for a photo, nor in teacher mode', async () => {
  mockApiFetch.mockResolvedValue(listOf([]));
  await show(message({ id: 'p1', media_mime: 'image/jpeg' }));
  expect(screen.queryByRole('button', { name: t.inbox.sticker.favourite })).toBeNull();
  await show(sticker, { kind: 'teacher', teacherId: 't1' });
  expect(screen.queryByRole('button', { name: t.inbox.sticker.favourite })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
