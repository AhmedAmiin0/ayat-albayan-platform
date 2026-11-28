import { LEAD_STATUSES } from '@ab/catalog';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t, listKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { cachedList, huda } from '@/inbox/shared/fixtures';
import { LeadDetailScreen } from '@/inbox/screens/LeadDetailScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
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

beforeEach(() => mockApi.reset('write'));

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
  mockApi.onWrite(() => new Promise(() => undefined));
  const client = await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.contacted }));
  expect(mockApi.writes()).toContainEqual({
    method: 'PATCH',
    path: '/leads/a1/status',
    body: { status: 'contacted' },
  });
  await waitFor(() => expect(statusInList(client)).toBe('contacted'));
  expect(screen.getByRole('button', { name: word.trial_booked })).toBeTruthy();
  expect(screen.queryByRole('button', { name: word.new })).toBeNull();
});

test('a refused move rolls back and says why', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'invalid_transition' })));
  const client = await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.lost }));
  expect(await screen.findByText(t.leads.invalidTransition)).toBeTruthy();
  expect(statusInList(client)).toBe('new');
  expect(screen.getByRole('button', { name: word.contacted })).toBeTruthy();
});

test('any other failure: the generic error', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(500)));
  await open('new');
  await fireEvent.press(screen.getByRole('button', { name: word.lost }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
