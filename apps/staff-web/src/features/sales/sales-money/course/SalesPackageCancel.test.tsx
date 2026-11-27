import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError, t } from '@ab/web-kit';
import { SalesPackageCancel } from './SalesPackageCancel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const words = t.subscriptions.cancel;
const URL = '/sales/packages/sub1/cancel';

function show(block: string | null) {
  apiFetch.mockResolvedValue({ subscriptionId: 'sub1', block });
  const onDone = vi.fn();
  client = renderWithClient(
    <SalesPackageCancel
      studentId="s1"
      subscriptionId="sub1"
      label="سهيلة · AB-0183"
      onDone={onDone}
    />,
  );
  return onDone;
}
let client: QueryClient;

const action = () => screen.findByRole('button', { name: words.action });

describe('SalesPackageCancel «إلغاء الباقة» of the assistant (owner 2026-11-02)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('an unused package: confirm, POST with the reason, the «done» line, a refresh', async () => {
    const onDone = show(null);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await action());
    const dialog = within(screen.getByRole('dialog', { name: words.title }));
    fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: ' خطأ ' } });
    apiSend.mockResolvedValueOnce({ id: 'sub1', status: 'cancelled' });
    fireEvent.click(dialog.getByRole('button', { name: words.confirm }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.done));
    expect(apiFetch).toHaveBeenCalledWith(URL);
    expect(apiSend).toHaveBeenCalledWith('POST', URL, { reason: 'خطأ' });
    for (const queryKey of [['course-actions', 's1'], ['students'], ['money'], ['sales']])
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });

  it.each(['has_lessons', 'has_payments', 'already_cancelled', 'has_commission'])(
    'hidden on %s',
    async (block) => {
      show(block);
      await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(URL));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryByRole('button', { name: words.action })).toBeNull();
    },
  );

  it('a 409 the check did not see (a payment meanwhile) is said in Arabic', async () => {
    show(null);
    fireEvent.click(await action());
    const dialog = within(screen.getByRole('dialog', { name: words.title }));
    apiSend.mockRejectedValueOnce(new ApiError(409, { code: 'has_payments' }));
    fireEvent.click(dialog.getByRole('button', { name: words.confirm }));
    expect(await dialog.findByText(words.errors.has_payments)).toBeTruthy();
  });

  it('without subscriptions.stop (403 from the check): nothing shown', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, { code: 'forbidden' }));
    renderWithClient(
      <SalesPackageCancel studentId="s1" subscriptionId="sub1" label="x" onDone={vi.fn()} />,
    );
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith(URL));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('button', { name: words.action })).toBeNull();
  });
});
