import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { SUB } from './course-actions-fixture';
import { StopCourseDialog } from './StopCourseDialog';

// «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02): the choice is the person's, never automatic.
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

describe('StopCourseDialog: the refund choice', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('with subscriptions.refund: «إلغاء فقط» by default, the money kept, no refund sent', async () => {
    const { dialog } = await open(['subscriptions.stop', 'subscriptions.refund']);
    expect(dialog.getByRole<HTMLInputElement>('radio', { name: words.cancelOnly }).checked).toBe(
      true,
    );
    apiSend.mockResolvedValue({ subscriptionId: SUB, refund: null });
    fireEvent.click(confirm());
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-stop', BASE),
    );
  });

  it('«إلغاء مع استرداد»: the lines, the computed amount by default, the toast names it', async () => {
    const { dialog, onDone } = await open(['subscriptions.stop', 'subscriptions.refund']);
    fireEvent.click(dialog.getByRole('radio', { name: words.withRefund }));
    const money = (n: number) => moneyText(n, 'SAR');
    expect(dialog.getByText(words.refundTotal.replace('{amount}', money(140)))).toBeTruthy();
    expect(dialog.getByText(words.refundPaid.replace('{amount}', money(290)))).toBeTruthy();
    apiSend.mockResolvedValue({
      subscriptionId: SUB,
      refund: { amount: 140, card: 0, manual: 140 },
    });
    fireEvent.click(confirm());
    await vi.waitFor(() =>
      expect(onDone).toHaveBeenCalledWith(words.doneRefund.replace('{amount}', money(140))),
    );
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-stop', {
      ...BASE,
      refund: { amount: 140 },
    });
  });

  it('the amount may be lowered, never raised above the refund', async () => {
    const { dialog } = await open(['subscriptions.stop', 'subscriptions.refund']);
    fireEvent.click(dialog.getByRole('radio', { name: words.withRefund }));
    const field = dialog.getByLabelText(words.refundAmount);
    fireEvent.change(field, { target: { value: '200' } });
    expect(confirm().disabled).toBe(true);
    expect(dialog.getByText(t.courseActions.errors.refund_exceeds_allowed)).toBeTruthy();
    fireEvent.change(field, { target: { value: '100' } });
    apiSend.mockResolvedValue({
      subscriptionId: SUB,
      refund: { amount: 100, card: 0, manual: 100 },
    });
    fireEvent.click(confirm());
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-stop', {
        ...BASE,
        refund: { amount: 100 },
      }),
    );
  });

  it('without subscriptions.refund (sales by default) or with nothing to refund: no choice', async () => {
    const { dialog } = await open(['subscriptions.stop']);
    expect(dialog.queryByRole('radio', { name: words.withRefund })).toBeNull();
    expect(dialog.getByText(words.money.split('{amount}')[0] ?? '', { exact: false })).toBeTruthy();
  });

  it('a package with nothing left to refund offers «إلغاء فقط» only', async () => {
    const none = { ...PREVIEW, refund: { ...refund, charged: 400, refund: 0 } };
    const { dialog } = await open(['subscriptions.stop', 'subscriptions.refund'], none);
    expect(dialog.queryByRole('radio', { name: words.withRefund })).toBeNull();
  });
});
