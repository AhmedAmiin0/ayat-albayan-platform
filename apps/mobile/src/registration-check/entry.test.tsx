import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { detail, inbound } from '@/inbox/thread-fixtures';
import { ThreadScreen } from '@/inbox/ThreadScreen';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { TreeBaseProvider } from '@/nav/tree-base';
import { AllStudentsScreen } from '@/sales/AllStudentsScreen';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

// The two ways in: the sales chat header (the number filled in) and the «الطلاب» tab header.
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: (h: unknown) => mockPush(h) },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const BASE = ['inbox.read', 'inbox.send', 'messages.read', 'self.sales', 'self.sales_academy'];
const action = () => screen.queryByRole('button', { name: t.registrationCheck.action });

function asSales(permissions: string[]) {
  const me = { role: 'sales', permissions };
  const body = detail([inbound]);
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/auth/me' ? me : p.startsWith('/threads') ? body : { items: [], total: 0 },
  );
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), me);
  return client;
}

beforeEach(() => jest.clearAllMocks());

test('the sales chat header opens the check for this number, in the sales tree', async () => {
  const client = asSales([...BASE, 'students.check_registration']);
  await renderWithQuery(<TreeBaseProvider value="/sales"><ThreadScreen /></TreeBaseProvider>, client);
  await screen.findByText(inbound.body ?? '');
  await fireEvent.press(await screen.findByRole('button', { name: t.registrationCheck.action }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/sales/inbox/registration-check', params: { phone: '+966552147730' } });
});

test('the «الطلاب» tab header opens it too', async () => {
  const client = asSales([...BASE, 'students.check_registration']);
  await renderWithQuery(<TreeBaseProvider value="/sales"><AllStudentsScreen asTab /></TreeBaseProvider>, client);
  await fireEvent.press(await screen.findByRole('button', { name: t.registrationCheck.action }));
  expect(mockPush).toHaveBeenCalledWith('/sales/students/registration-check');
});

test('hidden without students.check_registration, in both headers', async () => {
  const client = asSales(BASE);
  await renderWithQuery(<TreeBaseProvider value="/sales"><ThreadScreen /></TreeBaseProvider>, client);
  await screen.findByText(inbound.body ?? '');
  expect(action()).toBeNull();
  screen.unmount();
  await renderWithQuery(<AllStudentsScreen asTab />, asSales(BASE));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(action()).toBeNull();
});
