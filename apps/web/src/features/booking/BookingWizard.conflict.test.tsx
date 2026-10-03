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

const CONFLICT = new ApiError(409, {
  code: 'conflict',
  message: 'conflict',
  conflicts: [
    { kind: 'student_busy', startsAt: SLOT, endsAt: SLOT, studentId: 'x' },
    { kind: 'outside_availability', startsAt: '2026-10-07T14:00:00.000Z', endsAt: '2026-10-07T14:45:00.000Z' },
  ],
});
const BOOKED = { rule_id: 'r1', student_ids: ['s'], guardian_ids: ['g'], lessons: [{ id: 'l', starts_at: SLOT, ends_at: SLOT }], message_ids: [] };

async function reachReview() {
  apiFetch.mockImplementation(respond);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPage search={{ leadId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', phone: '+966501234567', name: 'أم جود' }} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText(t.leads.studentName), { target: { value: 'جود' } });
  next();
  await pickTeacherAndSlot();
  next();
  fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
}

describe('BookingWizard conflicts (R-SCH-04, issue B3)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists each clash in Arabic, then books anyway with the reason', async () => {
    routeSend(apiSend, [CONFLICT, BOOKED]);
    await reachReview();
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    expect(screen.getByText(/لدى الطالب حلقة أخرى في هذا الموعد \(الأحد 4 أكتوبر 17:00\)/)).toBeTruthy();
    // The teacher's own clock rides along on availability lines (Cairo is UTC+3 until 29 Oct).
    expect(screen.getByText(/خارج المواعيد المتاحة للمعلم\/ة \(الأربعاء 7 أكتوبر 17:00، عند المعلم\/ة 17:00 بتوقيت/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.booking.overrideReason), { target: { value: 'ولي الأمر موافق' } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.override }));
    await waitFor(() => expect(bookingBodies(apiSend)).toHaveLength(2));
    expect(bookingBodies(apiSend)[1]).toMatchObject({ override: { reason: 'ولي الأمر موافق' } });
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  });

  it('«اختر موعدًا آخر» goes back to the slot step', async () => {
    routeSend(apiSend, [CONFLICT]);
    await reachReview();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.changeSlot }));
    const slotStep = screen.getByRole('region', { name: t.booking.steps.slot });
    expect(document.activeElement).toBe(slotStep); // focus follows the step, not <body>
  });

  it('a lead booking sends the new student, the guardian and the trial package', async () => {
    routeSend(apiSend, [BOOKED]);
    await reachReview();
    await waitFor(() => expect(bookingBodies(apiSend)).toHaveLength(1));
    expect(bookingBodies(apiSend)[0]).toMatchObject({
      leadId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      package: 'trial',
      byday: [0],
      newStudent: { name: 'جود', program: 'quran', tz: 'Asia/Riyadh', status: 'trial' },
      guardian: { name: 'أم جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh', country: 'SA' },
    });
  });
});
