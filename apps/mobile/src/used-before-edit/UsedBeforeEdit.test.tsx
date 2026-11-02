import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { UsedBeforeEdit } from './UsedBeforeEdit';
import type { EditablePackage } from './use-used-before-edit';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): admins and assistants, on a package card.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const e = t.salesMoney.usedBeforeEdit;
const m = t.salesMoney;
// 8 lessons, 2 a week: usedBeforeMax 6; 3 taken on the platform → at most 5.
const SUB: EditablePackage = { id: 'sub1', status: 'active', lessons_total: 8, lessons_used: 4, lessons_used_before: 1 };

const show = (sub: EditablePackage = SUB, client = createTestQueryClient()) =>
  renderWithQuery(<UsedBeforeEdit sub={sub} stale={[['sales']]} />, client);

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset().mockResolvedValue(undefined);
});

test('without subscriptions.set_start_date: no action', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['self.sales'] });
  await show(SUB, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});

test('a cancelled package: no action', async () => {
  await show({ ...SUB, status: 'cancelled' });
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});

test('the stepper starts at the stored number and stops at the max; «حفظ» sends it', async () => {
  await show();
  await press(e.action);
  expect(screen.getByLabelText(`${m.usedBefore}: 1`)).toBeTruthy();
  for (let i = 0; i < 8; i += 1) await press(m.usedBeforeMore);
  expect(screen.getByLabelText(`${m.usedBefore}: 5`)).toBeTruthy();
  await press(e.save);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/subscriptions/sub1/lessons-used-before', {
      lessonsUsedBefore: 5,
    }),
  );
  await waitFor(() => expect(screen.getByRole('button', { name: e.action })).toBeTruthy());
});

test('a booked course: the API refusal in words, the editor stays open', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'used_before_course_booked' }));
  await show();
  await press(e.action);
  await press(m.usedBeforeLess);
  await press(e.save);
  expect(await screen.findByText(e.errors.used_before_course_booked)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/subscriptions/sub1/lessons-used-before', {
    lessonsUsedBefore: 0,
  });
});

test('an unknown failure: the generic line', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await show();
  await press(e.action);
  await press(e.save);
  expect(await screen.findByText(e.errors.generic)).toBeTruthy();
});
