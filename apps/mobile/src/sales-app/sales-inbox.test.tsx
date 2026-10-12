import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { InboxScreen } from '@/inbox/InboxScreen';
import { thread } from '@/inbox/thread-fixtures';
import { t } from '@/lib/i18n';
import { TreeBaseProvider } from '@/nav/tree-base';
import { renderWithQuery } from '@/test/query';

// The salesperson's «المحادثات» tab (/sales/inbox): the chats alone, as the web /sales/inbox.
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Even a salesperson granted leads.read gets no leads list in the sales tree (its rows are admin routes).
const ME = { role: 'sales', permissions: ['inbox.read', 'inbox.send', 'messages.read', 'leads.read', 'self.sales'] };

async function open(base: '' | '/sales') {
  const threads = { items: [thread], total: 1 };
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? ME : p.startsWith('/threads') ? threads : { items: [], total: 0 }));
  await renderWithQuery(
    <TreeBaseProvider value={base}>
      <InboxScreen />
    </TreeBaseProvider>,
  );
  await screen.findByText(thread.display_name ?? '');
}

beforeEach(() => jest.clearAllMocks());

test('sales tree: no leads switcher and no lead / family tags on the rows; a row opens /sales/inbox/thread', async () => {
  await open('/sales');
  expect(screen.queryByRole('tab', { name: t.nav.leads })).toBeNull();
  expect(screen.queryByText(t.enums.leadStatus.new)).toBeNull();
  expect(screen.queryByText(new RegExp(t.enums.leadSource.facebook_ad))).toBeNull();
  await fireEvent.press(screen.getByText(thread.display_name ?? ''));
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/inbox\/thread\//));
});

test('admin tree (a double-role admin): the leads switcher and the tags stay', async () => {
  await open('');
  expect(await screen.findByRole('tab', { name: t.nav.leads })).toBeTruthy();
  expect(screen.getAllByText(t.enums.leadStatus.new).length).toBeGreaterThan(0);
});
