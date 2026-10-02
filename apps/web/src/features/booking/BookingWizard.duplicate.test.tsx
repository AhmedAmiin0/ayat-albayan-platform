import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { BookingPage } from './BookingPage';
import { bookingBodies, next, pickTeacherAndSlot, respond, routeSend, SLOT } from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/admin/schedule">{children}</a>,
}));

const LEAD = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const JOUD = { id: '2d7e9f3c-4e5f-4a6b-9c0d-9e8f7a6b5c4d', code: 'AB-0190', name: 'جود', status: 'trial' };
const DUPLICATE = new ApiError(409, { code: 'duplicate_student', message: 'duplicate_student', guardian_id: 'g', candidates: [JOUD] });
const BOOKED = { rule_id: 'r1', student_ids: [JOUD.id], guardian_ids: ['g'], lessons: [{ id: 'l', starts_at: SLOT, ends_at: SLOT }], message_ids: [] };

async function bookFromLead() {
  apiFetch.mockImplementation(respond);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPage search={{ leadId: LEAD, phone: '+966501234567', name: 'أم جود' }} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText(t.students.name), { target: { value: 'جوود' } });
  next();
  await pickTeacherAndSlot();
  next();
  fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
  return screen.findByText(t.students.duplicateTitle);
}

describe('BookingWizard — a lead whose family is already on file (R-STU-03, R-LEAD-06, issue A1)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('offers the existing child; booking them sends their id with the lead', async () => {
    routeSend(apiSend, [DUPLICATE, BOOKED]);
    await bookFromLead();
    fireEvent.click(screen.getByRole('button', { name: t.booking.bookExisting }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    await waitFor(() => expect(bookingBodies(apiSend)).toHaveLength(2));
    const [first, second] = bookingBodies(apiSend);
    expect(second).toMatchObject({ studentIds: [JOUD.id], leadId: LEAD });
    expect(second).not.toHaveProperty('newStudent');
    // Same wizard, same booking: the idempotency key does not change between the two tries.
    expect(second?.['clientRequestId']).toBe(first?.['clientRequestId']);
  });

  it('«لا، ده طالب جديد» books the new student anyway (force)', async () => {
    routeSend(apiSend, [DUPLICATE, BOOKED]);
    await bookFromLead();
    fireEvent.click(screen.getByRole('button', { name: t.booking.newAnyway }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.submit }));
    await waitFor(() => expect(bookingBodies(apiSend)).toHaveLength(2));
    expect(bookingBodies(apiSend)[1]).toMatchObject({ force: true, newStudent: { name: 'جوود' } });
  });
});
