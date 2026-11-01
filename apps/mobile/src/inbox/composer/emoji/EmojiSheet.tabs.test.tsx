import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { PHONE } from '@/inbox/shared/thread-fixtures';
import { EmojiSheet } from './EmojiSheet';

// The emoji panel's tabs as WhatsApp (owner 2026-11-01): Emoji | GIF | Stickers, staff only.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const M1 = 'b1111111-1111-4111-8111-111111111111';
const ITEM = { message_id: M1, phone: PHONE, key: 'sha:abc=' };
const FILE = { url: 'https://storage.test/s.webp', mime: 'image/webp', expires_at: new Date(Date.now() + 3_600_000).toISOString() };
const c = t.inbox.composer;

function serve(answers: Record<string, unknown>) {
  mockApiFetch.mockImplementation(async (path: string) => {
    const hit = Object.keys(answers).find((p) => path.startsWith(p));
    return hit ? answers[hit] : FILE;
  });
}

const show = (media = true, onClose = jest.fn()) => {
  const panel = media ? { phone: PHONE, onError: jest.fn() } : undefined;
  return renderWithQuery(<EmojiSheet visible onPick={jest.fn()} onClose={onClose} media={panel} />);
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('a teacher (no media) gets the emoji alone, no tabs', async () => {
  await show(false);
  expect(screen.queryByRole('tab', { name: c.tabs.gif })).toBeNull();
  expect(screen.getByRole('button', { name: '🌹' })).toBeTruthy();
});

test('GIF without a GIPHY key: the tab says an admin must add it', async () => {
  serve({ '/threads/gifs': { configured: false, items: [] } });
  await show();
  await fireEvent.press(screen.getByRole('tab', { name: c.tabs.gif }));
  expect(await screen.findByText(c.gifNoKey)).toBeTruthy();
});

test('a GIF tap sends it by its GIPHY id and closes the panel', async () => {
  const gif = { id: 'x9', title: 'thanks', preview: 'https://media.giphy.com/x9/200w.gif', width: 200, height: 150 };
  serve({ '/threads/gifs': { configured: true, items: [gif] } });
  mockApiSend.mockResolvedValue({ id: 'g1', phone_e164: PHONE });
  const onClose = jest.fn();
  await show(true, onClose);
  await fireEvent.press(screen.getByRole('tab', { name: c.tabs.gif }));
  await fireEvent.press(await screen.findByTestId('gif-x9'));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockApiSend.mock.calls[0]?.[1]).toBe('/threads/%2B966552147730/gif');
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({ gifId: 'x9' });
  expect(onClose).toHaveBeenCalled();
});

test('stickers: favourites then recent; a tap sends that sticker again', async () => {
  serve({ '/threads/stickers': { favourites: [ITEM], recent: [] } });
  mockApiSend.mockResolvedValue({ id: 's1', phone_e164: PHONE });
  await show();
  await fireEvent.press(screen.getByRole('tab', { name: c.tabs.stickers }));
  expect(await screen.findByText(c.stickerFavourites)).toBeTruthy();
  expect(screen.queryByText(c.stickerRecent)).toBeNull();
  const cell = screen.getByTestId(`sticker-${M1}`);
  await waitFor(() => expect(cell.props.accessibilityState).toMatchObject({ disabled: false }));
  await fireEvent.press(cell);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockApiSend.mock.calls[0]?.slice(1, 2)).toEqual(['/threads/%2B966552147730/sticker']);
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({ messageId: M1 });
});

test('no stickers yet: a short note', async () => {
  serve({ '/threads/stickers': { favourites: [], recent: [] } });
  await show();
  await fireEvent.press(screen.getByRole('tab', { name: c.tabs.stickers }));
  expect(await screen.findByText(c.stickersEmpty)).toBeTruthy();
});
