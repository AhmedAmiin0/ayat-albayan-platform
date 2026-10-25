import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, message, thread } from '../thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadScreen } from './ThreadScreen';

// «رد» (owner 2026-10-25): a long press on a bubble → the menu → the composer's one-line quote strip.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const asked = message({
  id: 'm1',
  direction: 'inbound',
  status: 'delivered',
  body: 'السلام عليكم\nأريد تسجيل ابنتي',
  replyable: true,
  forwardable: true,
  created_at: minutesAgo(10),
});
const ours = message({ id: 'm2', body: 'أهلًا وسهلًا', status: 'sent', replyable: true, created_at: minutesAgo(8) });
const forwarded = message({ id: 'm3', body: 'رابط الحلقة', status: 'sent', forwarded: true, created_at: minutesAgo(6) });

async function open(inboundAt = minutesAgo(5), teacher = false) {
  const data = detail([asked, ours, forwarded], { thread: { ...thread, last_inbound_at: inboundAt } });
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/messages/gate' ? { open: true, reason: null, queued: 0 } : data,
  );
  const screenUi = teacher ? (
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>
      <ThreadScreen />
    </ThreadModeProvider>
  ) : (
    <ThreadScreen />
  );
  await renderWithQuery(screenUi, createTestQueryClient());
  await screen.findByText(asked.body ?? '');
}
const menu = () => screen.getByTestId('message-menu');
const strip = () => screen.queryByTestId('reply-strip');
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);

async function replyTo(id: string) {
  await fireEvent(screen.getByTestId(`bubble-${id}`), 'longPress');
  await fireEvent.press(within(menu()).getByRole('button', { name: t.inbox.reply.action }));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('a long press opens the menu with «رد» and «إعادة توجيه», each a 44pt button', async () => {
  await open();
  await fireEvent(screen.getByTestId('bubble-m1'), 'longPress');
  expect(within(menu()).getByRole('button', { name: t.inbox.reply.action })).toBeTruthy();
  expect(within(menu()).getByRole('button', { name: t.inbox.forward.action })).toBeTruthy();
  await fireEvent.press(within(menu()).getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByTestId('message-menu')).toBeNull();
});

test('a bubble with actions tells the screen reader how to reach them', async () => {
  await open();
  const text = screen.getByText(asked.body ?? '');
  expect(text.props.accessibilityHint).toBe(t.inbox.reply.swipeHint);
  expect(text.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['reply', 'forward', 'longpress']);
});

test('«رد» shows one strip: the chat name and only the first line; ✕ cancels it', async () => {
  await open();
  await replyTo('m1');
  expect(within(strip() ?? menu()).getByText(/^هدى سالم · السلام عليكم$/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.reply.cancel }));
  expect(strip()).toBeNull();
});

test('answering our own message names its sender, else «أنت»', async () => {
  await open();
  await replyTo('m2');
  expect(within(strip() ?? menu()).getByText(new RegExp(`^${t.inbox.reply.you} · أهلًا وسهلًا$`))).toBeTruthy();
});

test('the text goes with replyToMessageId; its row shows the quote at once; success clears the strip', async () => {
  let answer: (row: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  await open();
  await replyTo('m1');
  await fireEvent.changeText(box(), 'أهلًا بك');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/%2B966552147730/text', {
    text: 'أهلًا بك',
    clientRequestId: expect.any(String),
    replyToMessageId: 'm1',
  });
  expect(await screen.findByTestId('quote-m1')).toBeTruthy();
  expect(strip()).toBeTruthy();
  answer(message({ id: 'srv', body: 'أهلًا بك', status: 'sent' }));
  await waitFor(() => expect(strip()).toBeNull());
});

test('a refused answer keeps the strip (and the text) for another try', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'reply_not_in_thread' }));
  await open();
  await replyTo('m1');
  await fireEvent.changeText(box(), 'أهلًا بك');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText(t.inbox.error.reply_not_in_thread)).toBeTruthy();
  expect(strip()).toBeTruthy();
  expect(box().props.value).toBe('أهلًا بك');
});

test('after the 24 h window «رد» is off in the menu, with why', async () => {
  await open(minutesAgo(3 * 24 * 60));
  await fireEvent(screen.getByTestId('bubble-m1'), 'longPress');
  const reply = within(menu()).getByRole('button', { name: t.inbox.reply.action });
  expect(reply.props.accessibilityState).toMatchObject({ disabled: true });
  expect(within(menu()).getByText(t.inbox.sessionClosed)).toBeTruthy();
  await fireEvent.press(reply);
  expect(strip()).toBeNull();
});

test('a forwarded message says so on top of its bubble', async () => {
  await open();
  expect(within(screen.getByTestId('bubble-m3')).getByText(t.inbox.forward.forwarded)).toBeTruthy();
  expect(within(screen.getByTestId('bubble-m1')).queryByText(t.inbox.forward.forwarded)).toBeNull();
});

test('a teacher\'s chat has no menu: the actions are the admin\'s and sales\'', async () => {
  await open(minutesAgo(5), true);
  await fireEvent(screen.getByTestId('bubble-m1'), 'longPress');
  expect(screen.queryByTestId('message-menu')).toBeNull();
  expect(screen.getByText(asked.body ?? '').props.accessibilityHint).toBeUndefined();
});
