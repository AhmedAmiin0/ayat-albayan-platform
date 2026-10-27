import type { MessageView, ThreadDetail } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { ChatNotice } from '../../thread/components/ChatNotice';
import { threadKey, type ThreadCache } from '../../thread/hooks/thread-cache';
import { MessageBubble } from '../components/MessageBubble';
import { message, PHONE, thread } from '../../shared/thread-fixtures';
import { emojiLabel } from './ReactionBar';

// «تفاعل» (owner 2026-10-27), Arabic (RTL): hold a bubble → the emoji row; a tap reacts once, a tap on
// ours removes it; the pill opens who reacted. JS only; the API is a mock (no WhatsApp call).
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));

const PATH = `/threads/${encodeURIComponent(PHONE)}/messages/m1/reaction`;
const now = new Date().toISOString();
const open = { ...thread, reactable: true, session_open: true, last_inbound_at: now };
const text = message({ id: 'm1', direction: 'inbound', status: 'delivered', body: 'السلام عليكم', replyable: true, created_at: now });

/** The bubble as the chat screen draws it: from the thread cache, so an optimistic change shows. */
function Cached({ id }: { id: string }) {
  const { data } = useQuery<ThreadCache>({ queryKey: threadKey(PHONE), queryFn: () => new Promise(() => undefined), enabled: false });
  const m = data?.pages[0]?.messages.find((x) => x.id === id);
  return m ? <MessageBubble message={m} phone={PHONE} /> : null;
}

async function chat(m: MessageView, th = open) {
  const page: ThreadDetail = { thread: th, messages: [m], has_more: false, lessons: [], people: { guardian: null, lead: null, students: [] } };
  const client = createTestQueryClient();
  client.setQueryData<ThreadCache>(threadKey(PHONE), { pages: [page], pageParams: [null] });
  return renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={th}>
      <Cached id={m.id} />
      <ChatNotice />
    </ChatActionsProvider>,
    client,
  );
}
const hold = async (id = 'm1') => fireEvent(screen.getByTestId(`bubble-${id}`), 'longPress');
const bar = () => within(screen.getByTestId('reaction-bar'));

beforeEach(() => {
  mockApiSend.mockReset().mockImplementation(async (_m: string, _p: string, body: { emoji: string | null }) => ({
    message: { ...text, reactions: { theirs: null, ours: body.emoji, ours_by: 'هبة' } },
    status: 'sent',
    error_code: null,
    error_text: null,
  }));
});

test('holding a bubble shows the six emoji and «+» (44pt, spoken names) over the message menu', async () => {
  await chat(text);
  await hold();
  const names = bar().getAllByRole('button').map((b) => b.props.accessibilityLabel);
  expect(names).toEqual([...['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emojiLabel), t.inbox.reactions.more]);
  expect(names[0]).toBe(t.inbox.reactions.withEmoji.replace('{name}', t.inbox.reactions.like));
  expect(screen.getByTestId('message-menu')).toBeTruthy();
});

test('a tap reacts once (optimistic pill), a tap on ours removes it', async () => {
  await chat(text);
  await hold();
  await fireEvent.press(bar().getByRole('button', { name: emojiLabel('👍') }));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { emoji: '👍', clientRequestId: expect.any(String) });
  expect(await screen.findByTestId('reaction-pill-m1')).toBeTruthy();
  expect(screen.queryByTestId('reaction-bar')).toBeNull();
  await hold();
  expect(bar().getByRole('button', { name: emojiLabel('👍') }).props.accessibilityState).toMatchObject({ selected: true });
  await fireEvent.press(bar().getByRole('button', { name: emojiLabel('👍') }));
  expect(mockApiSend).toHaveBeenLastCalledWith('PUT', PATH, { emoji: null, clientRequestId: expect.any(String) });
  expect(mockApiSend).toHaveBeenCalledTimes(2);
});

test('«+» opens the emoji sheet; a pick reacts with it', async () => {
  jest.useFakeTimers();
  await chat(text);
  await hold();
  await fireEvent.press(bar().getByRole('button', { name: t.inbox.reactions.more }));
  await act(async () => jest.runOnlyPendingTimers());
  jest.useRealTimers();
  await fireEvent.press(within(screen.getByTestId('emoji-sheet')).getAllByRole('button')[0] ?? screen.getByTestId('emoji-sheet'));
  expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { emoji: expect.any(String), clientRequestId: expect.any(String) });
});

test('a screen reader reaches the row without the long press («تفاعل» action)', async () => {
  await chat(text);
  const body = screen.getByText('السلام عليكم');
  expect(body.props.accessibilityActions).toContainEqual({ name: 'react', label: t.inbox.reactions.react });
  await fireEvent(body, 'accessibilityAction', { nativeEvent: { actionName: 'react' } });
  expect(screen.getByTestId('reaction-bar')).toBeTruthy();
});

test('a refused reaction puts the bubble back and says why', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await chat(text);
  await hold();
  await fireEvent.press(bar().getByRole('button', { name: emojiLabel('❤️') }));
  expect(await screen.findByText(t.inbox.reactions.failed)).toBeTruthy();
  expect(screen.queryByTestId('reaction-pill-m1')).toBeNull();
});

test('the pill: who reacted, «إزالة» on ours', async () => {
  await chat({ ...text, reactions: { theirs: '❤️', ours: '👍', ours_by: 'هبة' } });
  const pill = screen.getByTestId('reaction-pill-m1');
  expect(pill.props.accessibilityLabel).toBe(t.inbox.reactions.pill.replace('{list}', '❤️ 👍'));
  await fireEvent.press(pill);
  const sheet = within(screen.getByTestId('reactors-sheet'));
  expect(sheet.getByText(thread.display_name ?? '')).toBeTruthy();
  expect(sheet.getByText('هبة')).toBeTruthy();
  await fireEvent.press(sheet.getByRole('button', { name: t.inbox.reactions.removeLabel.replace('{emoji}', '👍') }));
  expect(mockApiSend).toHaveBeenCalledWith('PUT', PATH, { emoji: null, clientRequestId: expect.any(String) });
});

test.each([
  ['the line cannot react (the CRM line)', text, { ...open, reactable: false }],
  ['the window is closed', text, { ...open, last_inbound_at: '2026-01-01T00:00:00Z' }],
  ['WhatsApp does not know the message', { ...text, replyable: false }, open],
] as const)('no row when %s', async (_why, m, th) => {
  await chat(m, th);
  if (screen.queryByTestId('bubble-m1')) await hold();
  expect(screen.queryByTestId('reaction-bar')).toBeNull();
});
