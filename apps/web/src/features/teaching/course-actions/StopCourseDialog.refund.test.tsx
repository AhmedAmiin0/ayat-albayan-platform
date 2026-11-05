import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { SUB } from './course-actions-fixture';
import { StopCourseDialog } from './StopCourseDialog';

// The stop sheet's money (owner 2026-11-06): «إلغاء فقط» with what is still owed, or «إلغاء مع
// استرداد» with the refund amount; the person chooses, a summary line says the outcome.
const perms = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const words = t.courseActions.stop;
const refund = {
  paid: 290,
  perLesson: 50,
  attended: 3,
  ratePercent: 100,
  charged: 150,
  refund: 140,
};
const PREVIEW = {
  subscriptionId: SUB,
  futureLessons: 4,
  activeRules: 1,
  paid: 290,
  currency: 'SAR',
  refund,
  refundUnavailable: false,
  owe: { charged: 150, price: 400 },
  stopped: null,
};
const BASE = { subscriptionId: SUB, reason: 'سفر', clientRequestId: expect.any(String) };

async function open(keys: string[], preview: object = PREVIEW) {
  perms.list = keys;
  apiFetch.mockResolvedValue(preview);
  const onDone = vi.fn();
  renderWithClient(
    <StopCourseDialog studentId="s1" subscriptionId={SUB} onClose={vi.fn()} onDone={onDone} />,
  );
  const dialog = within(screen.getByRole('dialog', { name: words.title }));
  await dialog.findByText(words.schedule);
  fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: 'سفر' } });
  return { dialog, onDone };
}

const confirm = () => screen.getByRole<HTMLButtonElement>('button', { name: words.confirm });

const KEYS = ['subscriptions.stop', 'subscriptions.refund'];
const money = (n: number) => moneyText(n, 'SAR');
const summary = (refund: number, due: number) =>
  words.summary.replace('{refund}', money(refund)).replace('{due}', money(due));
const sent = async (extra: object) =>
  vi.waitFor(() =>
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-stop', { ...BASE, ...extra }),
  );

describe('StopCourseDialog: the money choices', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    apiSend.mockResolvedValue({ subscriptionId: SUB, refund: null });
  });

  it('«إلغاء فقط» by default, attended × rate owed (shown), the summary says 0 back / 0 due', async () => {
    const { dialog } = await open(KEYS);
    expect(dialog.getByRole<HTMLInputElement>('radio', { name: words.cancelOnly }).checked).toBe(true);
    const attended = words.oweAttended.replace('{amount}', money(150));
    expect(dialog.getByRole<HTMLInputElement>('radio', { name: attended }).checked).toBe(true);
    expect(dialog.getByText(summary(0, 0))).toBeTruthy();
    fireEvent.click(confirm());
    await sent({ owe: { choice: 'attended' } });
  });

  it('«إلغاء فقط» with the full price: the summary shows what remains owed', async () => {
    const { dialog } = await open(KEYS);
    fireEvent.click(dialog.getByRole('radio', { name: words.owePrice.replace('{amount}', money(400)) }));
    expect(dialog.getByText(summary(0, 110))).toBeTruthy();
    fireEvent.click(confirm());
    await sent({ owe: { choice: 'price' } });
  });

  it('«إلغاء مع استرداد»: unattended by default, everything paid offered, nothing left owed', async () => {
    const { dialog, onDone } = await open(KEYS);
    fireEvent.click(dialog.getByRole('radio', { name: words.withRefund }));
    const unattended = words.refundUnattended.replace('{amount}', money(140));
    expect(dialog.getByRole<HTMLInputElement>('radio', { name: unattended }).checked).toBe(true);
    expect(dialog.getByText(summary(140, 0))).toBeTruthy();
    fireEvent.click(dialog.getByRole('radio', { name: words.refundAll.replace('{amount}', money(290)) }));
    expect(dialog.getByText(summary(290, 0))).toBeTruthy();
    apiSend.mockResolvedValue({ subscriptionId: SUB, refund: { amount: 290, card: 0, manual: 290 } });
    fireEvent.click(confirm());
    await sent({ refund: { choice: 'paid' } });
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.doneRefund.replace('{amount}', money(290))));
  });

  it('a custom refund: 0 .. net paid; above it the confirm is off', async () => {
    const { dialog } = await open(KEYS);
    fireEvent.click(dialog.getByRole('radio', { name: words.withRefund }));
    fireEvent.click(dialog.getByRole('radio', { name: words.refundCustom }));
    const field = dialog.getByLabelText(words.customAmount);
    fireEvent.change(field, { target: { value: '290.01' } });
    expect(confirm().disabled).toBe(true);
    expect(dialog.getByText(t.courseActions.errors.refund_exceeds_allowed)).toBeTruthy();
    fireEvent.change(field, { target: { value: '100' } });
    fireEvent.click(confirm());
    await sent({ refund: { choice: 'custom', amount: 100 } });
  });

  it('without subscriptions.refund (sales by default): owe choices only, no refund', async () => {
    const { dialog } = await open(['subscriptions.stop']);
    expect(dialog.queryByRole('radio', { name: words.withRefund })).toBeNull();
    expect(dialog.getByRole('radio', { name: words.oweNothing })).toBeTruthy();
  });

  it('the refund unreadable now: the sheet says why instead of hiding it silently', async () => {
    const preview = { ...PREVIEW, refund: null, refundUnavailable: true };
    const { dialog } = await open(KEYS, preview);
    expect(dialog.queryByRole('radio', { name: words.withRefund })).toBeNull();
    expect(dialog.getByText(words.refundUnavailable)).toBeTruthy();
  });
});
