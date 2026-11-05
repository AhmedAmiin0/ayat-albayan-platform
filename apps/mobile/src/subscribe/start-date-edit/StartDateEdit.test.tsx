import { daysBefore, riyadhToday } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { StartDateEdit } from './StartDateEdit';
import type { StartDatePackage } from './use-start-date-edit';

// «تعديل تاريخ البدء» (owner 2026-11-03): subscriptions.edit_terms only, StartDayPicker.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const e = t.salesMoney.startDateEdit;
const FROM = daysBefore(riyadhToday(), 40);
const SUB: StartDatePackage = { id: 'sub1', status: 'active', starts_on: FROM, lessons_used_before: 0 };
const show = (sub: StartDatePackage = SUB, client = createTestQueryClient()) =>
  renderWithQuery(<StartDateEdit sub={sub} stale={[['sales']]} />, client);
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('a normal assistant (subscriptions.set_start_date, no edit_terms): no action', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['self.sales', 'subscriptions.set_start_date'] });
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
  mockApiSend.mockResolvedValue({ subscription_id: 'sub1', starts_on: daysBefore(FROM, 1) });
  await show();
  await press(e.action);
  const save = screen.getByRole('button', { name: e.save });
  expect(save.props.accessibilityState.disabled).toBe(true);
  await press(t.payments.mobile.dayBefore);
  await press(e.save);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/subscriptions/sub1/start-date', {
      startsOn: daysBefore(FROM, 1),
    }),
  );
  expect(await screen.findByText(e.saved)).toBeTruthy();
});

test('a refusal reads in the user words and the editor stays', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'used_before_needs_past_start' }));
  await show({ ...SUB, lessons_used_before: 2 });
  await press(e.action);
  await press(t.payments.mobile.dayAfter);
  await press(e.save);
  expect(await screen.findByText(e.errors.used_before_needs_past_start)).toBeTruthy();
  expect(screen.getByTestId('start-date-editor')).toBeTruthy();
});
