import { screen, waitFor } from '@testing-library/react-native';
import { t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient } from '@/test/query';
import { press, show, stateOf, SUB } from './test-util';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const e = t.salesMoney.usedBeforeEdit;

beforeEach(() => mockApi.reset('read'));

test('a normal assistant (subscriptions.set_start_date, no edit_terms): no action', async () => {
  mockApi.onRead(() => ({ permissions: ['self.sales', 'subscriptions.set_start_date'] }));
  const client = createTestQueryClient({ meFromApi: true });
  await show(SUB, client);
  // /auth/me has ANSWERED (useHolds is false until then), so the hidden button proves the gate.
  await waitFor(() => expect(client.getQueryData(pathKey('/auth/me'))).toBeTruthy());
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});

test('a cancelled package: no action', async () => {
  await show({ ...SUB, status: 'cancelled' });
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});

test('a start in the future with nothing counted: no action', async () => {
  await show({ ...SUB, starts_on: '2999-01-01', lessons_used_before: 0 });
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});

test('a booked course (the server state): its words, no stepper, «إلغاء» only', async () => {
  mockApi.onRead(() => stateOf({ blocked: 'used_before_course_booked' }));
  await show();
  await press(e.action);
  expect(await screen.findByText(e.errors.used_before_course_booked)).toBeTruthy();
  expect(screen.queryByRole('button', { name: e.save })).toBeNull();
  expect(screen.queryByRole('button', { name: t.salesMoney.usedBeforeMore })).toBeNull();
  await press(e.cancel);
  expect(screen.getByRole('button', { name: e.action })).toBeTruthy();
});
