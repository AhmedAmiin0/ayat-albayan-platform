import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { detail, inbound, NOW, thread } from '@/inbox/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// The salesperson's own tree (base role sales): the shared thread screen in sales mode under /sales.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const SALES_ME = { role: 'sales', permissions: ['inbox.read', 'inbox.send', 'messages.read', 'self.sales', 'self.sales_academy'] };
const family = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null };

async function open(th: typeof thread) {
  const body = detail([inbound], { thread: th });
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? body : p === '/auth/me' ? SALES_ME : []));
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), SALES_ME);
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <ThreadScreen />
    </TreeBaseProvider>,
    client,
  );
  await screen.findByText(th.display_name ?? '');
}

beforeEach(() => {
  jest.clearAllMocks();
  // Two days after the last inbound: the 24 h window is closed (the admin would see «إرسال تقييم الحلقة»).
  fakeNow(new Date(NOW.getTime() + 2 * 86_400_000));
});
afterEach(() => jest.useRealTimers());

test('a lead’s chat: «تسجيل طالب جديد» opens the sales wizard inside /sales, no subscription panel', async () => {
  await open(thread);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.registerNew }));
  expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/sales/inbox/book' }));
  for (const word of [t.inbox.subscription.subscribe, t.inbox.subscription.renew, t.inbox.subscription.title]) {
    expect(screen.queryByText(word)).toBeNull();
  }
});

test('a family’s chat: no packages or money, no «إرسال تقييم الحلقة» (feedback.write is not a sales grant)', async () => {
  await open(family);
  expect(screen.queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
  expect(screen.queryByText(t.inbox.subscription.title)).toBeNull();
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
});

test('«رجوع» with no history returns to the sales chats, never the admin inbox', async () => {
  await open(thread);
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(router.replace).toHaveBeenCalledWith('/sales/inbox');
});
