import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider, type TreeBase } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { answer } from '../../lists/list-fixtures';
import { ThreadScreen } from '../../screens/ThreadScreen';
import { detail, inbound, PHONE, thread } from '../../shared/thread-fixtures';

// «ربط بطالب موجود» (owner 2026-10-29) in the chat's «⋮»: leads.link_family, a lead's chat with no family.
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
const salesMe = (extra: string[]) => ({ role: 'sales', permissions: [...CHAT, 'self.sales', ...extra] });
const adminMe = { role: 'admin', permissions: [...CHAT, 'leads.link_family'] };
const action = () => within(screen.getByTestId('thread-menu')).queryByRole('button', { name: t.inbox.linkFamily.action });

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

test('the sales tree: a lead chat opens the picker for this number and lead, under /sales', async () => {
  await openMenu({ me: salesMe(['leads.link_family']), base: '/sales' });
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.linkFamily.action }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/inbox/link-family', params: { phone: PHONE, leadId: 'a1' } }),
  );
});

test('the admin tree, and a converted or lost lead with no family still offers it', async () => {
  await openMenu({ me: adminMe, th: { ...thread, lead_status: 'converted' } });
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.linkFamily.action }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({ pathname: '/inbox/link-family', params: { phone: PHONE, leadId: 'a1' } }),
  );
});

test('hidden without leads.link_family (a salesperson by default)', async () => {
  await openMenu({ me: salesMe(['students.check_registration']), base: '/sales' });
  expect(await screen.findByRole('button', { name: t.registrationCheck.action })).toBeTruthy();
  expect(action()).toBeNull();
});

test.each<[string, ThreadView]>([
  ['a family chat', { ...thread, guardian_id: 'g-1', guardian_name: 'أم يوسف' }],
  ['a teacher chat', { ...thread, teacher_id: 't-1', teacher_name: 'أ. هدى' }],
  ['a number with no lead', { ...thread, lead_id: null, lead_name: null, lead_status: null }],
])('hidden on %s, even with the key', async (_name, th) => {
  await openMenu({ me: adminMe, th });
  expect(await screen.findByRole('button', { name: t.inbox.copy.phone })).toBeTruthy();
  expect(action()).toBeNull();
});
