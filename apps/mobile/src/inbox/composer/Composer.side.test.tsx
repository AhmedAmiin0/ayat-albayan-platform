import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { leftToRight } from '../shared/physical-row.helpers';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

// The typing bar as WhatsApp (owner 2026-10-27), in Arabic (jest.setup: RTL): icons on the physical
// left, «أرسل» / «أرسل قالبًا» on the right.
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

async function show(lastInbound: string) {
  const th = { ...thread, last_inbound_at: lastInbound, reply_line: 'chat' as const };
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? gate : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

const shown = (names: string[]) => names.filter((n) => n !== '?');

test('open window: [template] … [file] [text] then «أرسل» last on the physical right', async () => {
  await show(ago(5));
  const order = shown(leftToRight(screen.getByTestId('open-row'), true));
  expect(order).toEqual([
    t.inbox.composer.sendTemplate,
    t.savedReplies.open,
    'quote-button',
    t.inbox.composer.attach,
    t.inbox.composer.placeholder,
    t.inbox.composer.send,
  ]);
});

test('closed window: the icons on the left, the note between, «أرسل قالبًا» on the physical right', async () => {
  await show(ago(3 * 24 * 60));
  const order = shown(leftToRight(screen.getByTestId('closed-row'), true));
  expect(order.at(-1)).toBe(t.inbox.composer.sendTemplate);
  expect(order.at(-2)).toBe('closed-note');
  expect(order.slice(0, 2)).toEqual([t.savedReplies.open, 'quote-button']);
});
