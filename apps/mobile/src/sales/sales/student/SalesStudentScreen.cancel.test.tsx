import { GRANTABLE_PERMISSIONS, selfPermissionsOf } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

// «إلغاء الباقة» in the assistant's «تفاصيل الطالب» (owner 2026-11-02): ANY student,
// subscriptions.stop, next to «إلغاء الاشتراك», only while the server says the package is unused.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'st1' }),
}));

const c = t.subscriptions.cancel;
const CHECK = '/sales/packages/sub2/cancel';
const CANCELLED = { id: 'sub2', status: 'cancelled' };
const sent = (init?: RequestInit) => init?.method === 'POST';
const serve = (block: string | null, post: () => unknown = () => CANCELLED) =>
  mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (sent(init)) return post();
    if (path === '/sales/students/st1') return details({ mine: false });
    if (path === CHECK) return { subscriptionId: 'sub2', block };
    throw new ApiError(404);
  });
const asSales = (permissions: readonly string[]) => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), {
    role: 'sales',
    permissions: [...permissions, ...selfPermissionsOf('sales')],
  });
  return client;
};
const SALES = GRANTABLE_PERMISSIONS.filter((p) => p !== 'subscriptions.write');

beforeEach(() => {
  mockApiFetch.mockReset();
});

test('an unused package of another family’s student: confirm with a reason → POST', async () => {
  serve(null);
  const client = asSales(SALES);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<SalesStudentScreen />, client);
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  expect(screen.getByText(c.body)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(c.reason), ' أُنشئت بالخطأ ');
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  const body = JSON.stringify({ reason: 'أُنشئت بالخطأ' });
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(CHECK, expect.objectContaining({ body })),
  );
  expect(await screen.findByText(c.done)).toBeTruthy();
  for (const queryKey of [['course-actions', 'st1'], ['students'], ['sales'], ['lessons']])
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
});

test.each(['has_lessons', 'has_payments', 'already_cancelled', 'has_commission'])(
  'hidden on %s',
  async (block) => {
    serve(block);
    await renderWithQuery(<SalesStudentScreen />, asSales(SALES));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(CHECK));
    await screen.findByRole('header', { name: details({ mine: false }).student.name });
    expect(screen.queryByRole('button', { name: c.action })).toBeNull();
  },
);

test('a 409 the check did not see is said in Arabic', async () => {
  serve(null, () => {
    throw new ApiError(409, { code: 'has_lessons' });
  });
  await renderWithQuery(<SalesStudentScreen />, asSales(SALES));
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  expect(await screen.findByText(c.errors.has_lessons)).toBeTruthy();
});

test('without subscriptions.stop: no check, no button', async () => {
  serve(null);
  await renderWithQuery(
    <SalesStudentScreen />,
    asSales(SALES.filter((p) => p !== 'subscriptions.stop')),
  );
  await screen.findByRole('header', { name: details({ mine: false }).student.name });
  expect(mockApiFetch).not.toHaveBeenCalledWith(CHECK);
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});
