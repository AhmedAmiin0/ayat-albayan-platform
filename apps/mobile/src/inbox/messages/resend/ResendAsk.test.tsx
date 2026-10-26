import type { MessageView, ThreadView } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { MessageBubble } from '../components/MessageBubble';
import { message, PHONE, thread } from '../../shared/thread-fixtures';
import { type ThreadMode, ThreadModeProvider } from '../../thread/hooks/thread-mode';

// Meta's 131060 on a new number's first message (owner 2026-10-27): clearer words and «اطلب إعادة الإرسال».
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const OPEN: ThreadView = { ...thread, last_inbound_at: minutesAgo(5) };
const CLOSED: ThreadView = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60) };
const unavailable = message({
  id: 'u1',
  direction: 'inbound',
  body: null,
  interactive_payload: { type: 'unsupported', unsupported: null, errors: [{ code: 131060, title: 'This message is unavailable.' }] },
});
const other = message({ ...unavailable, id: 'u2', interactive_payload: { type: 'unsupported', errors: [{ code: 131051 }] } });

async function show(m: MessageView, th: ThreadView = OPEN, mode: ThreadMode = { kind: 'admin' }) {
  await renderWithQuery(
    <ThreadModeProvider value={mode}>
      <ChatActionsProvider phone={PHONE} thread={th}>
        <MessageBubble message={m} phone={PHONE} />
      </ChatActionsProvider>
    </ThreadModeProvider>,
  );
  await act(async () => undefined);
}
const ask = () => screen.queryByRole('button', { name: t.inbox.resend.action });

beforeEach(() => mockApiSend.mockReset());

test('131060 says why in plain words and offers «اطلب إعادة الإرسال»; another unsupported keeps its words', async () => {
  await show(unavailable);
  expect(screen.getByText(t.inbox.unavailable)).toBeTruthy();
  expect(ask()).toBeTruthy();
  await show(other);
  expect(screen.getByText(t.inbox.unsupported)).toBeTruthy();
  expect(ask()).toBeNull();
});

test('hidden for a teacher and once the 24 h window is closed', async () => {
  await show(unavailable, OPEN, { kind: 'teacher', teacherId: 't1' });
  expect(ask()).toBeNull();
  await show(unavailable, CLOSED);
  expect(ask()).toBeNull();
});

test('the sheet shows the exact Arabic text; «أرسل» sends it once through the text send', async () => {
  let answer: (row: unknown) => void = () => undefined;
  mockApiSend.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
  await show(unavailable);
  await fireEvent.press(ask() ?? screen.getByText('missing'));
  expect(screen.getByTestId('resend-text')).toHaveTextContent(ar.inbox.resend.text);
  const send = screen.getByRole('button', { name: t.inbox.resend.send });
  await fireEvent.press(send);
  // The second tap lands once the button says it is sending (the state change is async).
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.resend.sending }));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  const [method, path, body] = mockApiSend.mock.calls[0] as [string, string, { text: string; clientRequestId: string }];
  expect([method, path, body.text]).toEqual(['POST', `/threads/${encodeURIComponent(PHONE)}/text`, ar.inbox.resend.text]);
  expect(body.clientRequestId).toEqual(expect.any(String));
  await act(async () => answer(message({ id: 'srv', status: 'queued', body: ar.inbox.resend.text })));
  await waitFor(() => expect(screen.queryByTestId('resend-sheet')).toBeNull());
});

test('a refused send stays on the sheet with the reason; asking again reuses the bubble’s clientRequestId', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await show(unavailable);
  await fireEvent.press(ask() ?? screen.getByText('missing'));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.resend.send }));
  expect(await screen.findByText(t.inbox.error.send_failed)).toBeTruthy();
  await fireEvent.press(screen.getAllByRole('button', { name: t.common.cancel }).at(-1) ?? screen.getByText('missing'));
  await fireEvent.press(ask() ?? screen.getByText('missing'));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.resend.send }));
  const ids = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
