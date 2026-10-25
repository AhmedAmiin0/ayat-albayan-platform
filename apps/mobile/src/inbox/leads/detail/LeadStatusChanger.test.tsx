import { LEAD_STATUSES } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { listKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { cachedList, huda } from '../../shared/fixtures';
import { LeadDetailScreen } from '../../screens/LeadDetailScreen';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'a1' }),
}));

const key = listKey('/leads', { q: '' });
const word = t.enums.leadStatus;

async function open(status = huda.status) {
  const client = createTestQueryClient();
  client.setQueryData(key, cachedList([{ ...huda, status }]));
  await renderWithQuery(<LeadDetailScreen />, client);
  return client;
}
const statusInList = (client: ReturnType<typeof createTestQueryClient>) =>
  (client.getQueryData(key) as ReturnType<typeof cachedList>).pages[0]?.items[0]?.status;

beforeEach(() => mockApiSend.mockReset());

test('offers exactly the moves the API allows from جديد', async () => {
  await open('new');
  const offered = LEAD_STATUSES.filter((s) => screen.queryByRole('button', { name: word[s] }));
  expect(offered.sort()).toEqual(
    ['contacted', 'converted', 'interested_no_slot', 'lost', 'no_reply', 'trial_booked'].sort(),
  );
});

test('مشترك is terminal: no changer at all', async () => {
  await open('converted');
  expect(screen.queryByText(t.leads.changeStatus)).toBeNull();
});

test('a move shows at once in the screen and the inbox, then PATCHes', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  const client = await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.contacted }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/status', { status: 'contacted' });
  await waitFor(() => expect(statusInList(client)).toBe('contacted'));
  // From اتواصلنا the changer now offers that status's moves, and جديد is gone.
  expect(screen.getByRole('button', { name: word.trial_booked })).toBeTruthy();
  expect(screen.queryByRole('button', { name: word.new })).toBeNull();
});

test('a refused move rolls back and says why', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
  const client = await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.lost }));
  expect(await screen.findByText(t.leads.invalidTransition)).toBeTruthy();
  expect(statusInList(client)).toBe('new');
  expect(screen.getByRole('button', { name: word.contacted })).toBeTruthy();
});

test('any other failure: the generic error', async () => {
  mockApiSend.mockRejectedValue(new ApiError(500));
  await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.lost }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
