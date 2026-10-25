import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { threadKey, threadMessages, type ThreadCache } from '../thread/hooks/thread-cache';
import { detail, inbound, message, PHONE, thread } from '../thread-fixtures';
import { ThreadScreen } from './ThreadScreen';
import { ticksLabel } from '../ticks.helpers';

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

const UUID = expect.stringMatching(/^[0-9a-f-]{36}$/);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const openThread = detail([inbound], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);

type Gate = { open: boolean; reason: 'switch_off' | 'not_configured' | null; queued: number };

async function open(gate: Gate = { open: true, reason: null, queued: 0 }) {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/messages/gate' ? gate : openThread));
  const client = createTestQueryClient();
  await renderWithQuery(<ThreadScreen />, client);
  await screen.findByText(inbound.body ?? '');
  return client;
}
const cached = (client: ReturnType<typeof createTestQueryClient>) =>
  threadMessages(client.getQueryData<ThreadCache>(threadKey(PHONE)));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('inside 24 h: free text shows at once as queued, then becomes the API row', async () => {
  let answer: (row: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const client = await open();
  expect(screen.getByText(new RegExp(t.inbox.sessionOpenUntil.replace(' {time}', '')))).toBeTruthy();
  await fireEvent.changeText(box(), '  أهلًا يا أم سلمى  ');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));

  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/%2B966552147730/text', {
    text: 'أهلًا يا أم سلمى',
    clientRequestId: UUID,
  });
  expect(await screen.findByText('أهلًا يا أم سلمى')).toBeTruthy();
  expect(screen.getByLabelText(ticksLabel(t.enums.messageStatus.queued))).toBeTruthy();
  expect(box().props.value).toBe('');

  const after = detail([inbound, message({ id: 'srv', body: 'أهلًا يا أم سلمى', status: 'sent' })]);
  mockApiFetch.mockImplementation(async (path: string) => (path === '/messages/gate' ? { open: true, reason: null, queued: 0 } : after));
  answer(message({ id: 'srv', body: 'أهلًا يا أم سلمى', status: 'sent' }));
  await waitFor(() => expect(cached(client).map((m) => m.id)).toEqual(['m1', 'srv']));
  expect(await screen.findByLabelText(ticksLabel(t.enums.messageStatus.sent))).toBeTruthy();
});

test('a refused send rolls back: the row goes, the text comes back, the reason shows', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'session_closed' }));
  const client = await open();
  await fireEvent.changeText(box(), 'لسه فاكرة؟');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText(t.inbox.error.session_closed)).toBeTruthy();
  expect(cached(client).map((m) => m.id)).toEqual(['m1']);
  expect(box().props.value).toBe('لسه فاكرة؟');
});

test('the same text sent again keeps its clientRequestId; an edited one gets a new one', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await open();
  await fireEvent.changeText(box(), 'تمام');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await screen.findByText(t.inbox.error.send_failed);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  const ids = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(ids[0]).toBe(ids[1]);
  await fireEvent.changeText(box(), 'تمام كده');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(3));
  expect((mockApiSend.mock.calls[2]?.[2] as { clientRequestId: string }).clientRequestId).not.toBe(ids[0]);
});

test('sending switched off: the box says messages wait in the queue', async () => {
  await open({ open: false, reason: 'switch_off', queued: 3 });
  expect(await screen.findByText(t.inbox.messagingOff)).toBeTruthy();
});

test('a gate closed on the server is said too (the switch alone would not send)', async () => {
  await open({ open: false, reason: 'not_configured', queued: 0 });
  expect(await screen.findByText(t.inbox.messagingOffServer)).toBeTruthy();
});

test('an empty box sends nothing', async () => {
  await open();
  await fireEvent.changeText(box(), '   ');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(mockApiSend).not.toHaveBeenCalled();
});
