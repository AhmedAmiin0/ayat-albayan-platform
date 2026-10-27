import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { leftToRight } from '../shared/physical-row.helpers';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

// The typing bar on an Arabic phone (jest.setup: RTL): the row is mirrored, the round button on the
// physical left, the box on the right. Owner 2026-10-27: only the price tag and the paperclip stay in it.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const gate = { open: true, reason: null, queued: 0 };

async function show(lastInbound: string, permissions?: string[]) {
  const th = { ...thread, last_inbound_at: lastInbound, reply_line: 'chat' as const };
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? gate : detail([inbound], { thread: th })));
  const client = createTestQueryClient();
  if (permissions) client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions });
  await renderWithQuery(<ThreadScreen />, client);
  await screen.findByText(inbound.body ?? '');
}

const shown = (names: string[]) => names.filter((n) => n !== '?');

test('open window with pricing.read: [round] [paperclip] [price tag] [text], left → right; nothing else', async () => {
  await show(ago(5));
  expect(leftToRight(screen.getByTestId('open-row'), true)).toEqual(['round-action', 'composer-pill']);
  expect(shown(leftToRight(screen.getByTestId('composer-pill'), true))).toEqual([
    t.inbox.composer.attach,
    'quote-button',
    t.inbox.composer.placeholder,
  ]);
});

test('open window without pricing.read: [round] [paperclip] [text]', async () => {
  await show(ago(5), ['inbox.read', 'inbox.send']);
  expect(shown(leftToRight(screen.getByTestId('composer-pill'), true))).toEqual([t.inbox.composer.attach, t.inbox.composer.placeholder]);
});

test('closed window: the note on its own line; under it «أرسل قالبًا» on the physical left, the icons on the right', async () => {
  await show(ago(3 * 24 * 60));
  const order = shown(leftToRight(screen.getByTestId('closed-row'), true));
  expect(order).toEqual([t.inbox.composer.sendTemplate, 'quote-button', t.savedReplies.open]);
  expect(within(screen.getByTestId('closed-row')).queryByTestId('closed-note')).toBeNull();
  expect(screen.getByTestId('closed-note')).toBeTruthy();
});
