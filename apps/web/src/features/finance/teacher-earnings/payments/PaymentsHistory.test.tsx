import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { Scope } from '../api';
import { page, PAYMENT } from '../fixtures';
import { PaymentsHistory } from './PaymentsHistory';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const VOIDED = { ...PAYMENT, id: 'p2', voided_at: '2026-10-05T09:00:00Z', void_reason: 'مبلغ خطأ' };

function show(scope: Scope) {
  apiFetch.mockResolvedValue(page([PAYMENT, VOIDED]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentsHistory scope={scope} />
    </QueryClientProvider>,
  );
}

describe('PaymentsHistory: voiding a teacher payment', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a voided payment stays listed, struck through with its reason, and cannot be voided again', async () => {
    show({ kind: 'admin', teacherId: 't1' });
    expect(await screen.findByText(t.finance.voided.replace('{reason}', 'مبلغ خطأ'))).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.finance.voidPayment })).toHaveLength(1);
  });

  it('«إلغاء الدفعة» asks for a reason, then voids', async () => {
    show({ kind: 'admin', teacherId: 't1' });
    apiSend.mockResolvedValue(VOIDED);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.voidPayment }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), { target: { value: 'حُوّل مرتين' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.voidPayment }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/teacher-earnings/payments/p1/void', { reason: 'حُوّل مرتين' }),
    );
  });

  it('a teacher sees the history but no void button', async () => {
    show({ kind: 'mine' });
    expect(await screen.findByText(t.finance.voided.replace('{reason}', 'مبلغ خطأ'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.finance.voidPayment })).toBeNull();
  });
});
