import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { emptyDraft, withPicks, type BookingDraft } from '../../draft/draft';
import { BookingModeContext } from '../../mode';
import { ReviewStep } from './ReviewStep';
import { ABRAR, SLOT, STUDENT_ID } from '../../wizard-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

const DRAFT: BookingDraft = { ...emptyDraft(), students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }], teacher: ABRAR, ...withPicks([SLOT]) };

afterEach(() => apiSend.mockReset());

describe('the review when the first lesson already passed (review M3)', () => {
  it('400 date_in_past: says so in words, and «اختر موعدًا آخر» goes back to the slot step', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'date_in_past', message: 'date_in_past' }));
    const onChangeSlot = vi.fn();
    const onPatch = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <BookingModeContext.Provider value="sales">
          <ReviewStep draft={DRAFT} onMeetingLink={vi.fn()} onChangeSlot={onChangeSlot} onInvoice={vi.fn()} onBooked={vi.fn()} onPatch={onPatch} />
        </BookingModeContext.Provider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.firstLessonPast)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.changeSlot }));
    expect(onChangeSlot).toHaveBeenCalledTimes(1);
    // Round 2 G: the past start and its extra picks go first, so «التالي» needs a new slot.
    expect(onPatch).toHaveBeenCalledWith({ startsAt: null, extra: [] });
    expect(onPatch.mock.invocationCallOrder[0] ?? 0).toBeLessThan(onChangeSlot.mock.invocationCallOrder[0] ?? 0);
  });
});
