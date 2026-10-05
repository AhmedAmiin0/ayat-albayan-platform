import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { SalesMeeting } from './api';
import { SalesMeetings } from './SalesMeetings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// Meeting 12:00-12:30 UTC. Join window: 11:45 .. 14:30 UTC.
const MEETING: SalesMeeting = {
  lesson_id: 'l-9',
  starts_at: '2026-10-03T12:00:00.000Z',
  ends_at: '2026-10-03T12:30:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  lead_or_student_name: 'أم سهيلة',
};

function open(rows: SalesMeeting[] = [MEETING]) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SalesMeetings />
    </QueryClientProvider>,
  );
}

describe('SalesMeetings «مواعيدي»', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }));
  afterEach(() => {
    cleanup();
    apiFetch.mockReset();
    vi.useRealTimers();
  });

  it('lists who and the teacher, asks the API for the local day, and joins only inside the window', async () => {
    vi.setSystemTime(new Date('2026-10-03T11:00:00.000Z'));
    open();
    expect(await screen.findByText('أم سهيلة')).toBeTruthy();
    expect(screen.getByText(/أبرار/)).toBeTruthy();
    expect(String(apiFetch.mock.calls[0]?.[0])).toMatch(/^\/sales\/meetings\?from=.+&to=.+/);
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('link', { name: t.classroom.enter })).toBeNull();
  });

  it('is open from 15 min before: a link to the classroom', async () => {
    vi.setSystemTime(new Date('2026-10-03T11:50:00.000Z'));
    open();
    const link = await screen.findByRole('link', { name: t.classroom.enter });
    expect(link.getAttribute('href')).toBe('/classroom/l-9');
  });

  it('closes 2 hours after the end', async () => {
    vi.setSystemTime(new Date('2026-10-03T14:31:00.000Z'));
    open();
    await screen.findByText('أم سهيلة');
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
  });

  it('a cancelled meeting is not listed; an empty day says so; the day buttons refetch', async () => {
    vi.setSystemTime(new Date('2026-10-03T11:00:00.000Z'));
    open([{ ...MEETING, status: 'cancelled_by_admin' }]);
    expect(await screen.findByText(t.sales.schedule.empty)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextDay }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  });
});
