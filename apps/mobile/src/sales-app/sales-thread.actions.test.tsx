import { screen } from '@testing-library/react-native';
import { detail, failed, inbound } from '@/inbox/thread-fixtures';
import { ThreadScreen } from '@/inbox/ThreadScreen';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { TreeBaseProvider } from '@/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// retry / «ابعتها بنفسك» / hand-off need messages.manage (admin-only): a salesperson never sees them.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const SALES_ME = { role: 'sales', permissions: ['inbox.read', 'inbox.send', 'messages.read', 'self.sales', 'self.sales_academy'] };

test('a failed send in the sales tree: its status word, but no retry / click-to-chat and no POST', async () => {
  const body = detail([inbound, failed]);
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? body : p === '/auth/me' ? SALES_ME : []));
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), SALES_ME);
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <ThreadScreen />
    </TreeBaseProvider>,
    client,
  );
  await screen.findByText(inbound.body ?? '');
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
  expect(screen.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131049']))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(screen.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  expect(screen.queryByText(t.messages.handedOff)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});
