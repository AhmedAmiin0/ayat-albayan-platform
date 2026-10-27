import type { MessageView, ThreadView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { readable, SHOWN } from './privacy.helpers';
import { detail, inbound, message, NOW, thread } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

// docs/12 §13.10: a plain word for the line on each bubble; no «سيصل ردّك عبر …» note any more (owner 2026-10-27).
const CHAT = t.enums.waLine.chat;
const NOTIFICATIONS = t.enums.waLine.notifications;
const replyFrom = (word: string) => t.inbox.line.replyFrom.replace('{line}', word);
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();
const openWindow = { last_inbound_at: minutesAgo(5) };
const closedWindow = { last_inbound_at: minutesAgo(25 * 60), session_open: false };

type Setup = { messages: MessageView[]; thread?: Partial<ThreadView>; teacher?: boolean };

async function render({ messages, thread: fields = {}, teacher = false }: Setup) {
  const body = detail(messages, { thread: { ...thread, ...fields } });
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? body : { open: true }));
  const mode = teacher ? ({ kind: 'teacher', teacherId: 't-abrar' } as const) : ({ kind: 'admin' } as const);
  await renderWithQuery(
    <ThreadModeProvider value={mode}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
  await screen.findByText(inbound.body ?? '');
}

const words = () => [CHAT, NOTIFICATIONS].flatMap((w) => screen.queryAllByText(w));
const anyReplyFrom = () => [CHAT, NOTIFICATIONS].flatMap((w) => screen.queryAllByText(replyFrom(w)));

beforeEach(() => {
  fakeNow(NOW);
  mockApiFetch.mockReset();
});

test('a chat-line bubble says so after its time; a bubble with no line says nothing', async () => {
  const sent = message({ id: 'm2', body: 'أهلًا وسهلًا', status: 'sent', line: null, created_at: minutesAgo(4) });
  await render({ messages: [{ ...inbound, line: 'chat', created_at: minutesAgo(5) }, sent], thread: openWindow });
  expect(screen.getAllByText(CHAT)).toHaveLength(1);
  expect(screen.queryByText(NOTIFICATIONS)).toBeNull();
});

test('each bubble names its own line', async () => {
  const reply = message({ id: 'm2', body: 'أهلًا وسهلًا', status: 'sent', line: 'notifications' });
  await render({ messages: [{ ...inbound, line: 'chat' }, reply] });
  expect(screen.getAllByText(CHAT)).toHaveLength(1);
  expect(screen.getAllByText(NOTIFICATIONS)).toHaveLength(1);
});

test.each(['chat', 'notifications'] as const)('open window, reply line %s: no «your reply goes via …» note (owner 2026-10-27: «Remove this»)', async (line) => {
  await render({ messages: [{ ...inbound, line: 'chat' }], thread: { ...openWindow, last_inbound_line: line, reply_line: line } });
  expect(anyReplyFrom()).toHaveLength(0);
});

test('no note when there is no reply line (a single line)', async () => {
  await render({ messages: [inbound], thread: { ...openWindow, last_inbound_line: null, reply_line: null } });
  expect(anyReplyFrom()).toHaveLength(0);
});

test('no note when the window is closed, even with a line', async () => {
  await render({ messages: [inbound], thread: { ...closedWindow, last_inbound_line: 'chat', reply_line: 'chat' } });
  expect(screen.getByText(t.inbox.sessionClosed)).toBeTruthy();
  expect(anyReplyFrom()).toHaveLength(0);
});

test('a thread with no line data (an old cache) renders as before: no word, no note', async () => {
  await render({ messages: [inbound], thread: openWindow });
  expect(words()).toHaveLength(0);
  expect(anyReplyFrom()).toHaveLength(0);
  expect(screen.getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
});

test('teacher: the line is named, never a digit of the number', async () => {
  const family = { ...openWindow, guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null };
  const named = { ...family, display_name: 'أم يوسف', last_inbound_line: 'chat' as const, reply_line: 'chat' as const };
  await render({ messages: [{ ...inbound, line: 'chat' }], thread: named, teacher: true });
  expect(screen.getByText(CHAT)).toBeTruthy();
  expect(anyReplyFrom()).toHaveLength(0);
  for (const s of SHOWN) expect(readable()).not.toContain(s);
});
