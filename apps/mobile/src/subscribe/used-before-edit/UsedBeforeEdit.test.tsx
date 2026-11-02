import { screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient } from '@/test/query';
import { press, show, stateOf, SUB } from './test-util';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): when the action shows at all.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const e = t.salesMoney.usedBeforeEdit;

beforeEach(() => mockApiFetch.mockReset());

test('a normal assistant (subscriptions.set_start_date, no edit_terms): no action', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['self.sales', 'subscriptions.set_start_date'] });
  await show(SUB, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
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
  mockApiFetch.mockResolvedValue(stateOf({ blocked: 'used_before_course_booked' }));
  await show();
  await press(e.action);
  expect(await screen.findByText(e.errors.used_before_course_booked)).toBeTruthy();
  expect(screen.queryByRole('button', { name: e.save })).toBeNull();
  expect(screen.queryByRole('button', { name: t.salesMoney.usedBeforeMore })).toBeNull();
  await press(e.cancel);
  expect(screen.getByRole('button', { name: e.action })).toBeTruthy();
});
