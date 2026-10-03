import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { emptyDraft, type BookingDraft } from './draft';
import { ReviewStep } from './ReviewStep';
import { ABRAR, SLOT, STUDENT_ID } from './wizard-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

const DRAFT: BookingDraft = {
  ...emptyDraft(),
  students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }],
  teacher: ABRAR,
  startsAt: SLOT,
  invoice: { source: 'whatsapp', messageId: 'm-1', mime: 'image/png', preview: null },
};

function renderReview() {
  const onInvoice = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewStep draft={DRAFT} onMeetingLink={vi.fn()} onChangeSlot={vi.fn()} onInvoice={onInvoice} onBooked={vi.fn()} onPatch={vi.fn()} />
    </QueryClientProvider>,
  );
  return onInvoice;
}

afterEach(() => apiSend.mockReset());

describe('ReviewStep invoice errors (R-PAY-03, R-MSG-06)', () => {
  it('shows the invoice summary row with «من الشات»', () => {
    renderReview();
    expect(screen.getByText(t.booking.invoice.label)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.fromChat)).toBeTruthy();
  });

  it.each([
    ['invoice_required', t.lessons.error.invoice_required],
    ['media_expired', t.lessons.error.media_expired],
  ])('%s: says so in Arabic and sends the admin back to the invoice step', async (code, text) => {
    apiSend.mockRejectedValue(new ApiError(code === 'media_expired' ? 410 : 400, { code, message: code }));
    const onInvoice = renderReview();
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect((await screen.findByRole('alert')).textContent).toContain(text);
    fireEvent.click(screen.getByRole('button', { name: t.booking.invoice.upload }));
    expect(onInvoice).toHaveBeenCalledTimes(1);
  });

  it('a makeup refusal is worded without a way back to the invoice', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'makeup_exists', message: 'makeup_exists' }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.lessons.error.makeup_exists);
    expect(screen.queryByRole('button', { name: t.booking.invoice.upload })).toBeNull();
  });
});
