import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AssistantHomeScreen } from '@/assistant-app/AssistantHomeScreen';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// The bell in the sales home («المحادثات») and the assistant home («حلقاتي»), as on the admin's Today.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const page = { items: [], total: 0, page: 1, pageSize: 20, unread: 2 };
const unreadName = t.bell.mobile.openUnread.replace('{n}', '2');

function answer(permissions: string[]) {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/auth/me') return { role: 'sales', permissions };
    if (p.startsWith('/me/notifications')) return page;
    if (p.startsWith('/threads')) return { items: [thread], total: 1 };
    return p.startsWith('/assistant') ? [] : { items: [], total: 0 };
  });
}

async function openInbox() {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <InboxScreen />
    </TreeBaseProvider>,
    createTestQueryClient({ meFromApi: true }),
  );
  await screen.findByText(thread.display_name ?? '');
}

beforeEach(() => jest.clearAllMocks());

test('sales: the bell sits beside «محادثة جديدة» and opens the sales notifications', async () => {
  answer(['inbox.read', 'inbox.send', 'notifications.push', 'self.sales']);
  await openInbox();
  fireEvent.press(await screen.findByRole('button', { name: unreadName }));
  expect(router.push).toHaveBeenCalledWith('/sales/more/notifications');
  expect(screen.getByRole('button', { name: t.inbox.newChat.title })).toBeTruthy();
});

test('sales without notifications.push: no bell', async () => {
  answer(['inbox.read', 'inbox.send', 'self.sales']);
  await openInbox();
  expect(screen.queryByRole('button', { name: unreadName })).toBeNull();
});

test('assistant: the bell in the «حلقاتي» header opens the assistant notifications', async () => {
  answer(['self.assistant', 'notifications.push']);
  await renderWithQuery(<AssistantHomeScreen can={() => true} />, createTestQueryClient({ meFromApi: true }));
  fireEvent.press(await screen.findByRole('button', { name: unreadName }));
  expect(router.push).toHaveBeenCalledWith('/assistant/more/notifications');
});
