import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

// The sales chat's top (owner 2026-10-18: more room to read): one header line, one strip of pills.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const BASE = ['inbox.read', 'inbox.send', 'messages.read', 'self.sales', 'self.sales_academy'];

async function open(th: typeof thread, permissions: string[]) {
  const me = { role: 'sales', permissions };
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? detail([inbound], { thread: th }) : me));
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), me);
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <ThreadScreen />
    </TreeBaseProvider>,
    client,
  );
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => jest.clearAllMocks());

test('the header is one line: back, the call and ONE «⋮»; «تحقق من التسجيل» is in its menu', async () => {
  await open(thread, [...BASE, 'students.check_registration']);
  const header = screen.getByTestId('chat-header');
  expect(within(header).getByRole('header', { name: thread.display_name ?? '' }).props.numberOfLines).toBe(1);
  expect(within(header).getByRole('button', { name: t.common.back })).toBeTruthy();
  expect(within(header).queryByRole('button', { name: t.registrationCheck.action })).toBeNull();
  expect(within(header).queryByRole('button', { name: t.inbox.copy.phone })).toBeNull();
  await fireEvent.press(within(header).getByRole('button', { name: t.inbox.chatMenu }));
  await fireEvent.press(within(screen.getByTestId('thread-menu')).getByRole('button', { name: t.registrationCheck.action }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/sales/inbox/registration-check' })),
  );
});

test('without students.check_registration the menu has no «تحقق من التسجيل»', async () => {
  await open(thread, BASE);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.chatMenu }));
  expect(within(screen.getByTestId('thread-menu')).getByRole('button', { name: t.inbox.copy.phone })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.registrationCheck.action })).toBeNull();
});

test('a lead: «تسجيل طالب جديد» is a pill in the one sideways-scrolling strip', async () => {
  await open(thread, BASE);
  const strip = screen.getByTestId('sales-chat-actions');
  expect(strip.props.horizontal).toBe(true);
  await fireEvent.press(within(strip).getByRole('button', { name: t.inbox.registerNew }));
  expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/sales/inbox/book' }));
});

test('a teacher’s chat (no lead, no family): no strip at all', async () => {
  await open({ ...thread, lead_id: null, lead_status: null, teacher_id: 't-1' }, BASE);
  expect(screen.queryByTestId('sales-chat-actions')).toBeNull();
});
