import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { clearComposerDrafts } from '../composer/draft-store';
import { ThreadScreen } from '../screens/ThreadScreen';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadsList } from './ThreadsList';

// Review 2026-10-29 #4 / C3: a half-written reply survives leaving the chat and shows on its row.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const OPEN = { ...thread, last_inbound_at: new Date(Date.now() - 5 * 60_000).toISOString() };
const NAME = thread.display_name ?? '';
const DRAFT = 'السعر الشهري للباقة';
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const row = () => within(screen.getByRole('button', { name: new RegExp(NAME) }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (p: string) =>
    p.startsWith('/threads?') ? { items: [OPEN], total: 1, page: 1, pageSize: 25 } : detail([inbound], { thread: OPEN }),
  );
});
afterEach(() => clearComposerDrafts());

async function typeAndLeave(text: string) {
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
  await fireEvent.changeText(box(), text);
  await screen.unmount();
}

test('the draft survives leaving the chat: the row reads «مسوّدة:» in the act colour, then the text', async () => {
  await typeAndLeave(`${DRAFT}\nهو`);
  await renderWithQuery(<ThreadsList />);
  await screen.findByText(NAME);
  const word = row().getByText(t.inbox.draft, { includeHiddenElements: true }); // the label reads it once
  expect(StyleSheet.flatten(word.props.style)).toMatchObject({ color: palette.light.act });
  expect(row().getByText(`${DRAFT} هو`)).toBeTruthy(); // one line
  expect(row().getByLabelText(`${t.inbox.draft} ${DRAFT} هو`)).toBeTruthy();
  expect(row().queryByText(`${t.inbox.you} ${thread.last_body ?? ''}`)).toBeNull();
});

test('back in the chat, the box holds the draft; sent or cleared, the row shows the last message again', async () => {
  await typeAndLeave(DRAFT);
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
  expect(box().props.value).toBe(DRAFT);
  await fireEvent.changeText(box(), '');
  await screen.unmount();
  await renderWithQuery(<ThreadsList />);
  await screen.findByText(NAME);
  expect(row().queryByText(t.inbox.draft)).toBeNull();
});

test('a sign-out (clearComposerDrafts) forgets it', async () => {
  await typeAndLeave(DRAFT);
  clearComposerDrafts();
  await renderWithQuery(<ThreadsList />);
  await screen.findByText(NAME);
  expect(row().queryByText(t.inbox.draft)).toBeNull();
});
