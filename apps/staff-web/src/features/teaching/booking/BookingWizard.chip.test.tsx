import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { BookSearch } from './api';
import { BookingPage } from './BookingPage';
import { ABRAR, respond, routeSend, SLOT, STUDENT_ID } from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

function renderBooking(search: BookSearch) {
  apiFetch.mockImplementation(respond);
  routeSend(apiSend, []);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPage search={search} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}
const chipText = () => t.booking.gapChip.split(' · ')[0] ?? '';

describe('the free gap chip (booking from the calendar)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a gap with a start shows «حجز من فترة متاحة · <when>» above the steps, also before a student is picked', async () => {
    renderBooking({ teacherId: ABRAR.id, startsAt: SLOT });
    expect(await screen.findByText(new RegExp(chipText()))).toBeTruthy();
    expect(screen.getByRole('region', { name: t.booking.steps.students })).toBeTruthy();
  });

  it('no gap, no chip', async () => {
    renderBooking({ studentId: STUDENT_ID });
    await screen.findByRole('region', { name: t.booking.steps.students });
    expect(screen.queryByText(new RegExp(chipText()))).toBeNull();
  });
});
