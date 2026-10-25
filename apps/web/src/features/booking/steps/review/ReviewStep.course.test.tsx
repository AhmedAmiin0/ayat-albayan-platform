import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { emptyDraft, withPicks, type BookingDraft } from '../../draft/draft';
import { BookingModeContext, type BookingMode } from '../../mode';
import { ReviewStep } from './ReviewStep';
import { ABRAR, SLOT, STUDENT_ID, WED_SLOT } from '../../wizard-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

const BASE: BookingDraft = {
  ...emptyDraft(),
  students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }],
  teacher: ABRAR,
  ...withPicks([SLOT, WED_SLOT]),
};
const COURSE: BookingDraft = { ...BASE, course: { perWeek: 2, lessonsTotal: 8, package: '8', startsOn: '2026-10-03' } };
const CLASH = { kind: 'teacher_busy', startsAt: SLOT, endsAt: SLOT };

/** The review with its own link state, so typing «رابط الحلقة» re-renders like the wizard does. */
function Review({ draft, onChangeSlot }: { draft: BookingDraft; onChangeSlot: () => void }) {
  const [link, setLink] = useState('');
  const d = { ...draft, meetingLink: link };
  return <ReviewStep draft={d} onMeetingLink={setLink} onChangeSlot={onChangeSlot} onInvoice={vi.fn()} onBooked={vi.fn()} onPatch={vi.fn()} />;
}

function renderReview(draft: BookingDraft, mode: BookingMode) {
  const onChangeSlot = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingModeContext.Provider value={mode}>
        <Review draft={draft} onChangeSlot={onChangeSlot} />
      </BookingModeContext.Provider>
    </QueryClientProvider>,
  );
  return onChangeSlot;
}

const checks = () => apiSend.mock.calls.filter(([, path]) => String(path).endsWith('/check'));

afterEach(() => apiSend.mockReset());

describe('the review step’s series check (owner 2026-10-18)', () => {
  it('the admin’s review never asks POST /booking/check, not on mount nor while typing the link', () => {
    renderReview(BASE, 'admin');
    fireEvent.change(screen.getByLabelText(new RegExp(t.booking.meetingLink)), { target: { value: 'https://meet.example/a' } });
    expect(checks()).toHaveLength(0);
    expect(screen.getByRole('button', { name: t.booking.submit }).hasAttribute('disabled')).toBe(false);
  });

  it('a course with a clash lists it with only «اختر موعدًا آخر»: no «احجز», no reason, no override', async () => {
    apiSend.mockResolvedValue({ conflicts: [CLASH] });
    const onChangeSlot = renderReview(COURSE, 'sales');
    fireEvent.click(await screen.findByRole('button', { name: t.booking.changeSlot }));
    expect(onChangeSlot).toHaveBeenCalled();
    expect(checks()[0]?.[1]).toBe('/sales/booking/check');
    expect(screen.queryByRole('button', { name: t.booking.submit })).toBeNull();
    expect(screen.queryByRole('button', { name: t.booking.override })).toBeNull();
    expect(screen.queryByLabelText(new RegExp(t.booking.overrideReason))).toBeNull();
  });

  it('a course whose check failed says why, with «اختر موعدًا آخر» and no «احجز»', async () => {
    apiSend.mockRejectedValue(new ApiError(500, { code: 'internal' }));
    renderReview(COURSE, 'sales');
    expect(await screen.findByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.submit })).toBeNull();
  });

  it('a clean course check enables «احجز»', async () => {
    apiSend.mockResolvedValue({ conflicts: [] });
    renderReview(COURSE, 'sales');
    const submit = await screen.findByRole('button', { name: t.booking.submit });
    await vi.waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('button', { name: t.booking.changeSlot })).toBeNull();
  });
});
