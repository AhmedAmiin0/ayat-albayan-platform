import { fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// The salesperson's «المحادثات» tab (/sales/inbox): the chats alone, as the web /sales/inbox.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Even a salesperson granted leads.read gets no leads list in the sales tree (its rows are admin routes).
const ME = { role: 'sales', permissions: ['inbox.read', 'inbox.send', 'messages.read', 'leads.read', 'self.sales'] };

// A family on file whose running package owes money: the payload's flag, as an admin's list carries it.
const owing = { ...thread, phone_e164: '+966552147731', display_name: 'أم إيمان', guardian_id: 'g-1', lead_status: null, unpaid: true };
const rowOf = (name: string) => within(screen.getByRole('button', { name: new RegExp(name) }));

async function open(base: '' | '/sales') {
  const threads = { items: [thread, owing], total: 2 };
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? ME : p.startsWith('/threads') ? threads : { items: [], total: 0 }));
  await renderWithQuery(
    <TreeBaseProvider value={base}>
      <InboxScreen />
    </TreeBaseProvider>,
    createTestQueryClient({ meFromApi: true }),
  );
  await screen.findByText(thread.display_name ?? '');
}

beforeEach(() => jest.clearAllMocks());

test('sales tree: no leads switcher; rows show the lead stage + source, never «غير مدفوع»; a row opens /sales/inbox/thread', async () => {
  await open('/sales');
  expect(screen.queryByRole('tab', { name: t.nav.leads })).toBeNull();
  const lead = rowOf(thread.display_name ?? '');
  expect(lead.getByText(t.enums.leadStatus.new)).toBeTruthy();
  expect(lead.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(rowOf('أم إيمان').getByText(t.inbox.kind.guardian)).toBeTruthy();
  expect(screen.queryByText(t.enums.subscriptionStatus.unpaid)).toBeNull();
  await fireEvent.press(screen.getByText(thread.display_name ?? ''));
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/inbox\/thread\//));
});

test('admin tree (a double-role admin): the leads switcher and the tags stay', async () => {
  await open('');
  expect(await screen.findByRole('tab', { name: t.nav.leads })).toBeTruthy();
  expect(rowOf(thread.display_name ?? '').getByText(t.enums.leadStatus.new)).toBeTruthy();
  expect(rowOf('أم إيمان').getByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
});
