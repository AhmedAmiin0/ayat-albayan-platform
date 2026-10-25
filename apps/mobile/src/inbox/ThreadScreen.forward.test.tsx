import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { selectedLine } from './forward-text';
import { detail, message, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

// «إعادة توجيه» (owner 2026-10-25): the menu → a picker of up to five chats → POST /threads/forward.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const UUID = /^[0-9a-f-]{36}$/;
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const link = message({ id: 'm1', direction: 'inbound', status: 'delivered', body: 'رابط الحلقة', forwardable: true, created_at: minutesAgo(9) });
const chat = (n: number, fields: Partial<ThreadView> = {}): ThreadView => ({
  ...thread,
  phone_e164: `+96650000000${n}`,
  display_name: `ولي أمر ${n}`,
  ...fields,
});
const chats = [chat(1), chat(2, { session_open: false }), chat(3), chat(4), chat(5), chat(6, { display_name: null })];

async function openPicker() {
  const data = detail([link], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/messages/gate') return { open: true, reason: null, queued: 0 };
    if (path.startsWith('/threads?')) return { items: chats, total: chats.length, page: 1, pageSize: 25 };
    return data;
  });
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await fireEvent(await screen.findByTestId('bubble-m1'), 'longPress');
  await fireEvent.press(within(screen.getByTestId('message-menu')).getByRole('button', { name: t.inbox.forward.action }));
  await screen.findByTestId('forward-list');
  await screen.findByText('ولي أمر 1');
}
const row = (name: string) => screen.getByRole('checkbox', { name });
const pick = (name: string) => fireEvent.press(row(name));
const sendButton = () => screen.getByRole('button', { name: new RegExp(`^${t.inbox.forward.send} ·`) });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('the picker lists the newest chats; outside the window a chat says so but stays selectable', async () => {
  await openPicker();
  expect(screen.getByText(selectedLine(0, 5))).toBeTruthy();
  expect(sendButton().props.accessibilityState).toMatchObject({ disabled: true });
  expect(row('ولي أمر 2').props.accessibilityHint).toBe(t.inbox.forward.skip.session_closed);
  await pick('ولي أمر 2');
  expect(row('ولي أمر 2').props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByText(selectedLine(1, 5))).toBeTruthy();
});

test('up to five: the sixth is off and the counter says why; unpicking one frees it', async () => {
  await openPicker();
  for (const n of [1, 2, 3, 4, 5]) await pick(`ولي أمر ${n}`);
  expect(screen.getByText(t.inbox.forward.max.replace('{max}', '5'))).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: /0006/ }).props.accessibilityState).toMatchObject({ disabled: true });
  await pick('ولي أمر 1');
  expect(screen.getByRole('checkbox', { name: /0006/ }).props.accessibilityState).toMatchObject({ disabled: false });
});

test('«أرسل» posts the message, the picks in order and an id; the chat shows what was sent and skipped', async () => {
  mockApiSend.mockResolvedValue({
    results: [
      { phone: '+966500000003', sent: true, message_id: 'c3' },
      { phone: '+966500000002', sent: false, reason: 'session_closed' },
    ],
  });
  await openPicker();
  await pick('ولي أمر 3');
  await pick('ولي أمر 2');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/forward', {
    messageId: 'm1',
    targets: ['+966500000003', '+966500000002'],
    clientRequestId: expect.stringMatching(UUID),
  });
  const notice = await screen.findByTestId('chat-notice');
  expect(within(notice).getByText(t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '1'))).toBeTruthy();
  expect(within(notice).getByText(`ولي أمر 2: ${t.inbox.forward.skip.session_closed}`)).toBeTruthy();
  expect(screen.queryByTestId('forward-list')).toBeNull();
  await fireEvent.press(within(notice).getByRole('button', { name: t.inbox.forward.close }));
  expect(screen.queryByTestId('chat-notice')).toBeNull();
});

test('a failed post keeps the picks and says so; sending again reuses the same clientRequestId', async () => {
  mockApiSend.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
    results: [{ phone: '+966500000001', sent: true, message_id: 'c1' }],
  });
  await openPicker();
  await pick('ولي أمر 1');
  await fireEvent.press(sendButton());
  expect(await screen.findByText(t.inbox.forward.error)).toBeTruthy();
  expect(row('ولي أمر 1').props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(sendButton());
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  const ids = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(ids[1]).toBe(ids[0]);
  expect(await screen.findByText(t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '0'))).toBeTruthy();
});

test('the search goes to GET /threads?search=', async () => {
  await openPicker();
  await fireEvent.changeText(screen.getByLabelText(t.inbox.forward.search), 'هدى');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/threads\?search=/)));
});
