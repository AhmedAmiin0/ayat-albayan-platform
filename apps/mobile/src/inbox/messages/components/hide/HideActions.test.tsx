import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { pathKey } from '@/core/lib/query/query-keys';
import { t } from '@/core/lib/i18n/i18n';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { MessageBubble } from '@/inbox/messages/components/MessageBubble';
import { inbound, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// «حذف من المنصة» / «إظهار» (owner 2026-10-30): staff only, nothing sent to WhatsApp.
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => null),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const PATH = `/threads/%2B966552147730/messages/${inbound.id}/hide`;
const hidden: MessageView = {
  ...inbound,
  body: null,
  hidden: { by_name: 'سارة', at: '2026-10-30T10:00:00.000Z' },
};

async function open(m: MessageView, role: 'admin' | 'sales' | 'teacher') {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role, permissions: ['inbox.read', 'inbox.send'] });
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageBubble message={m} phone={PHONE} />
    </ChatActionsProvider>,
    client,
  );
}
const menu = async (m: MessageView) => {
  await fireEvent(screen.getByTestId(`bubble-${m.id}`), 'longPress');
  return within(screen.getByTestId('message-menu'));
};

beforeEach(() => mockApiSend.mockReset().mockResolvedValue(undefined));

test("sales hides after a confirm that says it stays on the customer's phone", async () => {
  await open(inbound, 'sales');
  const m = await menu(inbound);
  await fireEvent.press(m.getByRole('button', { name: t.inbox.hide.action }));
  expect(m.getByText(new RegExp(t.inbox.hide.body))).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(m.getByRole('button', { name: t.inbox.hide.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', PATH));
});

test('a teacher gets no «حذف من المنصة»', async () => {
  await open(inbound, 'teacher');
  const m = await menu(inbound);
  expect(m.queryByRole('button', { name: t.inbox.hide.action })).toBeNull();
});

test('hidden: the placeholder with who, never the text; the admin shows it again', async () => {
  await open(hidden, 'admin');
  expect(screen.getByText(t.inbox.hide.placeholder)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.inbox.hide.by.replace(/\{name\}.*$/, 'سارة')))).toBeTruthy();
  expect(screen.queryByText(inbound.body ?? '-')).toBeNull();
  const m = await menu(hidden);
  expect(m.queryByRole('button', { name: t.inbox.hide.action })).toBeNull();
  await fireEvent.press(m.getByRole('button', { name: t.inbox.hide.unhide }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('DELETE', PATH));
});

test("hidden, for sales: the placeholder and no menu at all («إظهار» is the admin's)", async () => {
  await open(hidden, 'sales');
  await fireEvent(screen.getByTestId(`bubble-${hidden.id}`), 'longPress');
  expect(screen.queryByTestId('message-menu')).toBeNull();
});
