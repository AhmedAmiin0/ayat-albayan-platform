import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider, type TreeBase } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { answer } from '../../lists/list-fixtures';
import { ThreadScreen } from '../../screens/ThreadScreen';
import { detail, inbound, PHONE, thread } from '../../shared/thread-fixtures';

// «تسجيل طالب جديد» (owner 2026-10-30: «Move the registration to three dots»): FIRST in a salesperson's «⋮»
// on a lead still in the funnel, in place of the pill over the chat.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const CHAT = ['inbox.read', 'inbox.send', 'messages.read'];
const salesMe = { role: 'sales', permissions: [...CHAT, 'self.sales', 'students.check_registration'] };
const menu = () => within(screen.getByTestId('thread-menu'));
const words = (): unknown[] => menu().getAllByRole('button').map((b) => within(b).getByText(/./).props.children);

async function openMenu({ me, th = thread, base = '' }: { me: unknown; th?: ThreadView; base?: TreeBase }) {
  mockApiFetch.mockImplementation(answer({ me, threads: () => detail([inbound], { thread: th }) }));
  await renderWithQuery(
    <TreeBaseProvider value={base}>
      <ThreadScreen />
    </TreeBaseProvider>,
    createTestQueryClient({ meFromApi: true }),
  );
  await screen.findByText(inbound.body ?? '');
  await fireEvent.press(within(screen.getByTestId('chat-header')).getByRole('button', { name: t.inbox.chatMenu }));
}

beforeEach(() => jest.clearAllMocks());

test('a salesperson on a lead: first in «⋮», it opens the sales wizard prefilled from the thread, under /sales', async () => {
  await openMenu({ me: salesMe, base: '/sales' });
  expect(t.inbox.registerNew).toBe('تسجيل طالب جديد');
  expect(words()).toEqual([t.inbox.registerNew, t.inbox.copy.phone, t.registrationCheck.action, t.common.cancel]);
  expect(screen.queryByTestId('sales-chat-actions')).toBeNull();
  await fireEvent.press(menu().getByRole('button', { name: t.inbox.registerNew }));
  expect(screen.queryByTestId('thread-menu')).toBeNull();
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/sales/inbox/book',
      params: { leadId: 'a1', phone: PHONE, mode: 'register', name: 'هدى سالم', source: 'facebook_ad' },
    }),
  );
});

test('not without self.sales (the admin), on the same lead chat', async () => {
  await openMenu({ me: { role: 'admin', permissions: CHAT } });
  expect(words()).toEqual([t.inbox.copy.phone, t.common.cancel]);
});

test.each<[string, ThreadView]>([
  ['a family chat', { ...thread, guardian_id: 'g-1', guardian_name: 'أم يوسف', lead_id: null }],
  ['a teacher chat', { ...thread, teacher_id: 't-1', teacher_name: 'أ. هدى' }],
  ['a converted lead', { ...thread, lead_status: 'converted' }],
  ['a lost lead', { ...thread, lead_status: 'lost' }],
  ['a number with no lead', { ...thread, lead_id: null, lead_name: null, lead_status: null }],
])('not on %s, even for a salesperson', async (_name, th) => {
  await openMenu({ me: salesMe, th, base: '/sales' });
  expect(menu().getByRole('button', { name: t.inbox.copy.phone })).toBeTruthy();
  expect(menu().queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
});
