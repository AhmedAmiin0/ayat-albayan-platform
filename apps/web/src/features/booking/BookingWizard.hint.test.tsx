import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { BookSearch } from './api';
import { BookingPage } from './BookingPage';
import { ABRAR, next, NOOR, respond, routeSend, SLOT, STUDENT_ID } from './wizard-fixture';

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
      <BookingPage search={{ studentId: STUDENT_ID, ...search }} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}

async function toTeacherStep() {
  await screen.findByRole('checkbox', { name: /جود/ });
  next();
  return screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
}

describe('booking from a calendar free gap (R-SCH-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('preselects the gap’s teacher, then its start on the slot step', async () => {
    renderBooking({ teacherId: ABRAR.id, startsAt: SLOT });
    const abrar = await toTeacherStep();
    expect(abrar).toHaveProperty('checked', true);
    next();
    next();
    const step = await screen.findByRole('region', { name: t.booking.steps.slot });
    expect(within(step).getByRole('status').textContent).toContain('17:00');
  });

  it('picking another teacher drops the hinted start', async () => {
    renderBooking({ teacherId: ABRAR.id, startsAt: SLOT });
    const noor = { ...NOOR, has_availability: true };
    apiFetch.mockImplementation((path: string) => (path.startsWith('/booking/teachers') ? Promise.resolve([ABRAR, noor]) : respond(path)));
    await toTeacherStep();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(NOOR.display_name_ar) }));
    next();
    next();
    expect(await screen.findByText(t.booking.pickSlotFirst)).toBeTruthy();
  });

  it('a teacher the filters leave out is ignored', async () => {
    renderBooking({ teacherId: '00000000-0000-4000-8000-000000000000', startsAt: SLOT });
    const abrar = await toTeacherStep();
    expect(abrar).toHaveProperty('checked', false);
  });
});
