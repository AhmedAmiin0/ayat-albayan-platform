import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import type { Scope } from '@/features/finance/teacher-earnings/api';
import { page, PAYMENT } from '@/features/finance/teacher-earnings/fixtures';
import { PaymentsHistory } from './PaymentsHistory';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const VOIDED = { ...PAYMENT, id: 'p2', voided_at: '2026-10-05T09:00:00Z', void_reason: 'مبلغ خطأ' };

function show(scope: Scope) {
  mockApi.onRead(() => page([PAYMENT, VOIDED]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentsHistory scope={scope} />
    </QueryClientProvider>,
  );
}

describe('PaymentsHistory: voiding a teacher payment', () => {
  beforeEach(() => {
    mockApi.reset('read');
    mockApi.reset('write');
  });

  it('a voided payment stays listed, struck through with its reason, and cannot be voided again', async () => {
    show({ kind: 'admin', teacherId: 't1' });
    expect(await screen.findByText(t.finance.voided.replace('{reason}', 'مبلغ خطأ'))).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.finance.voidPayment })).toHaveLength(1);
  });

  it('«إلغاء الدفعة» asks for a reason, then voids', async () => {
    show({ kind: 'admin', teacherId: 't1' });
    mockApi.onWrite(() => VOIDED);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.voidPayment }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), {
      target: { value: 'حُوّل مرتين' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.voidPayment }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/teacher-earnings/payments/p1/void',
        body: { reason: 'حُوّل مرتين' },
      }),
    );
  });

  it('a teacher sees the history but no void button', async () => {
    show({ kind: 'mine' });
    expect(await screen.findByText(t.finance.voided.replace('{reason}', 'مبلغ خطأ'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.finance.voidPayment })).toBeNull();
  });
});
