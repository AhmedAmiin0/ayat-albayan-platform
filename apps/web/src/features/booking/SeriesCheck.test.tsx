import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { emptyDraft, type BookingDraft } from './draft';
import { SeriesCheck } from './SeriesCheck';
import { ABRAR, SLOT, STUDENT_ID } from './wizard-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

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
  afterEach(() => apiSend.mockReset());

  it('counts the clashes in later weeks and words them on the teacher clock too', async () => {
    const outside = { kind: 'outside_availability', startsAt: '2026-11-01T14:00:00.000Z', endsAt: '2026-11-01T14:45:00.000Z' };
    apiSend.mockResolvedValue({ conflicts: [outside] });
    renderCheck();
    expect(await screen.findByText(t.booking.seriesCheck.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getByText(/عند المعلم\/ة 16:00 بتوقيت القاهرة/)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/check', expect.objectContaining({ studentIds: [STUDENT_ID] }));
  });

  it('says the series is free, and stays silent when the check fails or nothing is picked', async () => {
    apiSend.mockResolvedValue({ conflicts: [] });
    renderCheck();
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'duplicate_student' }));
    const { container } = renderCheck({ ...DRAFT, durationMin: 60 });
    await vi.waitFor(() => expect(container.textContent).toBe(''));
    expect(renderCheck({ ...DRAFT, startsAt: null }).container.textContent).toBe('');
  });
});
