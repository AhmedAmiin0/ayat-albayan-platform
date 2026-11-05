import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { money } from '@/payments';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, stopPreview, SUB } from './fixtures';

// «إلغاء فقط» / «إلغاء مع استرداد» on mobile (owner 2026-11-02), as on web: the person's choice.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const s = t.courseActions.stop;
const BODY = { subscriptionId: SUB, reason: 'سفر', clientRequestId: expect.any(String) };
const stopped = (refund: object | null) => ({
  subscriptionId: SUB,
  cancelledLessons: 3,
  endedRules: 1,
  studentStatus: 'churned',
  stoppedAt: 'x',
  refund,
});

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(serve());
  mockApiSend.mockReset();
});

const openSheet = async (client = createTestQueryClient()) => {
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={SUB} />, client);
  await fireEvent.press(await screen.findByRole('button', { name: s.action }));
  await fireEvent.changeText(await screen.findByPlaceholderText(s.reasonHint), 'سفر');
};

test('«إلغاء فقط» is the default: the money kept, no refund sent', async () => {
  mockApiSend.mockResolvedValue(stopped(null));
  await openSheet();
  expect(screen.getByRole('radio', { name: s.cancelOnly }).props.accessibilityState).toMatchObject({
    checked: true,
  });
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, BODY),
  );
  expect(await screen.findByText(s.done)).toBeTruthy();
});

test('«إلغاء مع استرداد»: the lines, the computed amount by default, the notice names it', async () => {
  mockApiSend.mockResolvedValue(stopped({ amount: 187.5, card: 0, manual: 187.5 }));
  await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: s.withRefund }));
  expect(screen.getByText(s.refundTotal.replace('{amount}', money(187.5, 'SAR')))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, {
      ...BODY,
      refund: { amount: 187.5 },
    }),
  );
  expect(
    await screen.findByText(s.doneRefund.replace('{amount}', money(187.5, 'SAR'))),
  ).toBeTruthy();
});

test('the amount may be lowered, never raised', async () => {
  mockApiSend.mockResolvedValue(stopped({ amount: 100, card: 0, manual: 100 }));
  await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: s.withRefund }));
  await fireEvent.changeText(screen.getByPlaceholderText('187.5'), '200');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByText(t.courseActions.errors.refund_exceeds_allowed)).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('187.5'), '100');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, {
      ...BODY,
      refund: { amount: 100 },
    }),
  );
});

test('without subscriptions.refund (sales by default): no choice', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: ['subscriptions.stop'] });
  await openSheet(client);
  expect(screen.queryByRole('radio', { name: s.withRefund })).toBeNull();
});

test('nothing left to refund: «إلغاء فقط» only', async () => {
  const refund = { paid: 300, perLesson: 37.5, attended: 8, ratePercent: 100, charged: 300 };
  mockApiFetch.mockImplementation(serve(stopPreview({ refund: { ...refund, refund: 0 } })));
  await openSheet();
  expect(screen.queryByRole('radio', { name: s.withRefund })).toBeNull();
});
