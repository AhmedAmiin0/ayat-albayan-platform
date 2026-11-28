import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { emptyDraft, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { SeriesCheck } from './SeriesCheck';
import { ABRAR, SLOT, STUDENT_ID } from '@/features/teaching/booking/wizard-fixture';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const DRAFT: BookingDraft = {
  ...emptyDraft(),
  students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }],
  teacher: ABRAR,
  startsAt: SLOT,
};
const renderCheck = (draft: BookingDraft = DRAFT) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SeriesCheck draft={draft} />
    </QueryClientProvider>,
  );

describe('SeriesCheck — the whole series before «احجز» (R-SCH-04, issue B3)', () => {
  afterEach(() => mockApi.reset('write'));

  it('counts the clashes in later weeks and words them on the teacher clock too', async () => {
    const outside = {
      kind: 'outside_availability',
      startsAt: '2026-11-01T14:00:00.000Z',
      endsAt: '2026-11-01T14:45:00.000Z',
    };
    mockApi.onWrite(() => ({ conflicts: [outside] }));
    renderCheck();
    expect(await screen.findByText(t.booking.seriesCheck.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getByText(/عند المعلم\/ة 16:00 بتوقيت القاهرة/)).toBeTruthy();
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/booking/check',
      body: expect.objectContaining({ studentIds: [STUDENT_ID] }),
    });
  });

  it('says the series is free, and stays silent when the check fails or nothing is picked', async () => {
    mockApi.onWrite(() => ({ conflicts: [] }));
    renderCheck();
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'duplicate_student' })));
    const { container } = renderCheck({ ...DRAFT, durationMin: 60 });
    await vi.waitFor(() => expect(container.textContent).toBe(''));
    expect(renderCheck({ ...DRAFT, startsAt: null }).container.textContent).toBe('');
  });
});
