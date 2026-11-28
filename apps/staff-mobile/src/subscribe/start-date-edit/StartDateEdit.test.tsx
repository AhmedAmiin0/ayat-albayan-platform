import { daysBefore } from '@ab/shared';
import { addCalendarDays, riyadhToday } from '@ab/time';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { pickDay } from '@/test/pickers/native-picker';
import { StartDateEdit } from './StartDateEdit';
import type { StartDatePackage } from './use-start-date-edit';
import { mockCall } from '@ab/testing/mock-call';

// Only with subscriptions.edit_terms.
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const e = t.salesMoney.startDateEdit;
const FROM = daysBefore(riyadhToday(), 40);
const SUB: StartDatePackage = {
  id: 'sub1',
  status: 'active',
  starts_on: FROM,
  lessons_used_before: 0,
};
const show = (sub: StartDatePackage = SUB, client = createTestQueryClient()) =>
  renderWithQuery(<StartDateEdit sub={sub} stale={[['sales']]} />, client);
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
};

beforeEach(() => {
  mockApi.reset('read');
  mockApi.reset('write');
});

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

test('a day back, PATCH { startsOn }, then «عُدِّل»', async () => {
  mockApi.onWrite(() => ({ subscription_id: 'sub1', starts_on: daysBefore(FROM, 1) }));
  await show();
  await press(e.action);
  const save = screen.getByRole('button', { name: e.save });
  expect(save.props.accessibilityState.disabled).toBe(true);
  await pickDay('date-picker-open', daysBefore(FROM, 1));
  await press(e.save);
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'PATCH',
      path: '/subscriptions/sub1/start-date',
      body: {
        startsOn: daysBefore(FROM, 1),
      },
    }),
  );
  expect(await screen.findByText(e.saved)).toBeTruthy();
});

test('a refusal reads in the user words and the editor stays', async () => {
  mockApi.onWrite(() =>
    Promise.reject(new ApiError(400, { code: 'used_before_needs_past_start' })),
  );
  await show({ ...SUB, lessons_used_before: 2 });
  await press(e.action);
  await pickDay('date-picker-open', addCalendarDays(FROM, 1));
  await press(e.save);
  expect(await screen.findByText(e.errors.used_before_needs_past_start)).toBeTruthy();
  expect(screen.getByTestId('start-date-editor')).toBeTruthy();
});
