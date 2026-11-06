import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { money } from '@/payments';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, stopPreview, SUB } from './fixtures';

// The stop sheet's money on mobile (owner 2026-11-06), as on web: the person chooses what is still
// owed or the refund amount; one summary line. 300 SAR paid, 3 of 8 attended (charge 112.5).
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

const sar = (n: number) => money(n, 'SAR');
const summary = (refund: number, due: number) =>
  s.summary.replace('{refund}', sar(refund)).replace('{due}', sar(due));
const checked = (name: string) =>
  screen.getByRole('radio', { name }).props.accessibilityState as { checked?: boolean };
const sent = (extra: object) =>
  waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, { ...BODY, ...extra }),
  );

test('«إلغاء فقط» by default, attended × rate owed: nothing more due on 300 paid', async () => {
  mockApiSend.mockResolvedValue(stopped(null));
  await openSheet();
  expect(checked(s.cancelOnly).checked).toBe(true);
  expect(checked(s.oweAttended.replace('{amount}', sar(112.5))).checked).toBe(true);
  expect(screen.getByText(summary(0, 0))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await sent({ owe: { choice: 'attended' } });
  expect(await screen.findByText(s.done)).toBeTruthy();
});

test('«إلغاء فقط» with a custom owed amount: 0 .. the price', async () => {
  mockApiSend.mockResolvedValue(stopped(null));
  await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: s.oweCustom }));
  const hint = s.customHint.replace('{amount}', sar(300));
  await fireEvent.changeText(screen.getByPlaceholderText(hint), '300.01');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByText(t.courseActions.errors.owed_exceeds_price)).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText(hint), '0');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await sent({ owe: { choice: 'custom', amount: 0 } });
});

test('«إلغاء مع استرداد»: unattended by default, everything paid offered, nothing left owed', async () => {
  mockApiSend.mockResolvedValue(stopped({ amount: 300, card: 0, manual: 300 }));
  await openSheet();
  await fireEvent.press(screen.getByRole('radio', { name: s.withRefund }));
  expect(checked(s.refundUnattended.replace('{amount}', sar(187.5))).checked).toBe(true);
  expect(screen.getByText(summary(187.5, 0))).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: s.refundAll.replace('{amount}', sar(300)) }));
  expect(screen.getByText(summary(300, 0))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await sent({ refund: { choice: 'paid' } });
  expect(await screen.findByText(s.doneRefund.replace('{amount}', sar(300)))).toBeTruthy();
});

test('without subscriptions.refund (sales by default): never below attended × rate', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: ['subscriptions.stop'] });
  await openSheet(client);
  expect(screen.queryByRole('radio', { name: s.withRefund })).toBeNull();
  expect(screen.queryByRole('radio', { name: s.oweNothing })).toBeNull();
  expect(screen.queryByRole('radio', { name: s.oweCustom })).toBeNull();
  expect(screen.getByRole('radio', { name: s.owePrice.replace('{amount}', sar(300)) })).toBeTruthy();
});

test('the refund unreadable now: the sheet says why', async () => {
  mockApiFetch.mockImplementation(serve(stopPreview({ refund: null, refundUnavailable: true })));
  await openSheet();
  expect(screen.queryByRole('radio', { name: s.withRefund })).toBeNull();
  expect(screen.getByText(s.refundUnavailable)).toBeTruthy();
});
