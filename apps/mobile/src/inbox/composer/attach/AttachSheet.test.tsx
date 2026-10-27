import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { Composer } from '../Composer';
import { threadKey } from '../../thread/hooks/thread-cache';
import { cachedThread, detail, PHONE, thread } from '../../shared/thread-fixtures';

// The paperclip's sheet (owner 2026-10-27): everything that left the bar, most used first.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({ open: true, reason: null, queued: 0 })),
  apiSend: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const OPEN = { ...thread, last_inbound_at: new Date(Date.now() - 5 * 60_000).toISOString() };
const c = t.inbox.composer;

async function sheet() {
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([], { thread: OPEN })));
  await renderWithQuery(<Composer phone={PHONE} thread={OPEN} lessons={[]} />, client);
  await fireEvent.press(screen.getByRole('button', { name: c.attach }));
  return screen.getByTestId('attach-tiles');
}

const labels = (tiles: ReturnType<typeof screen.getByTestId>) =>
  within(tiles)
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string);

test('six tiles in order: gallery, camera, document, template, quick replies, emoji; no «عرض سعر»', async () => {
  const tiles = await sheet();
  expect(labels(tiles)).toEqual([c.gallery, c.camera, c.document, c.modeTemplate, t.savedReplies.open, c.emoji]);
  expect(within(tiles).queryByRole('button', { name: t.inbox.quote.open })).toBeNull();
});

test('«قالب» closes the sheet and opens the template picker', async () => {
  const tiles = await sheet();
  await fireEvent.press(within(tiles).getByRole('button', { name: c.modeTemplate }));
  expect(screen.queryByTestId('attach-sheet')).toBeNull();
  expect(await screen.findByText(c.chooseTemplate)).toBeTruthy();
});

test('«الردود السريعة» closes the sheet and opens the saved replies', async () => {
  const tiles = await sheet();
  await fireEvent.press(within(tiles).getByRole('button', { name: t.savedReplies.open }));
  expect(screen.queryByTestId('attach-sheet')).toBeNull();
  expect(await screen.findByText(t.savedReplies.title)).toBeTruthy();
});

test('«الرموز التعبيرية» closes the sheet and opens the emoji sheet', async () => {
  const tiles = await sheet();
  await fireEvent.press(within(tiles).getByRole('button', { name: c.emoji }));
  expect(screen.queryByTestId('attach-sheet')).toBeNull();
  expect(screen.getByTestId('emoji-sheet')).toBeTruthy();
});
