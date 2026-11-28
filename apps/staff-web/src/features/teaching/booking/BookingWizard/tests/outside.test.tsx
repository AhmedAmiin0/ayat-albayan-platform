import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { BookingPage } from '@/features/teaching/booking/BookingPage';
import { ABRAR, bookingBodies, next, respond, routeSend, STUDENT_ID } from '@/features/teaching/booking/wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
  apiSend,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

/** Monday 5 Oct 12:00 Riyadh (09:00Z): outside the teacher hours; Sunday 17:00 inside. */
const NOON = '2026-10-05T09:00:00.000Z';
const SUN_17 = '2026-10-04T14:00:00.000Z';
const at = (startsAt: string, inside: boolean) => ({
  starts_at: startsAt,
  ends_at: startsAt,
  inside_hours: inside,
});
const LIST = {
  server_now: '2026-10-03T09:00:00.000Z',
  teacher_tz: 'Africa/Cairo',
  step_min: 30,
  slots: [at(SUN_17, true), at(NOON, false)],
};
const RESULT = {
  rule_id: 'e7777777-7777-4777-8777-777777777771',
  student_ids: [STUDENT_ID],
  guardian_ids: ['e7777777-7777-4777-8777-777777777772'],
  lessons: [],
  message_ids: ['e7777777-7777-4777-8777-777777777774'],
  invoice_id: null,
};

function renderTrial() {
  apiFetch.mockImplementation((path: string) =>
    path.startsWith('/booking/outside-slots') ? Promise.resolve(LIST) : respond(path),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BookingPage search={{ studentId: STUDENT_ID, kind: 'trial' }} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
}

async function pickOutsideNoon() {
  await screen.findByRole('radio', { name: t.booking.kind.trial });
  next();
  fireEvent.click(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }));
  next();
  next();
  fireEvent.click(await screen.findByRole('button', { name: t.booking.otherTime }));
  const days = await screen.findByRole('group', { name: t.booking.otherTimeDay });
  fireEvent.click(within(days).getByRole('radio', { name: new RegExp(`^${t.enums.weekday[1]} `) }));
  fireEvent.click(screen.getByRole('radio', { name: /^12:00/ }));
  expect(screen.getAllByText(t.booking.outsideHours).length).toBeGreaterThan(0);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(
      false,
    ),
  );
  next();
}

describe('BookingWizard «وقت آخر» (owner 2026-11-21)', () => {
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it.each(['2026-10-03T09:00:00.000Z', '2026-10-09T23:00:00.000Z', '2026-09-28T02:00:00.000Z'])(
    'browser clock %s: the server list, the review warning and the flagged body are the same',
    async (device) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(device));
      routeSend(apiSend, [RESULT]);
      renderTrial();
      await pickOutsideNoon();
      expect(apiFetch).toHaveBeenCalledWith(
        `/booking/outside-slots?teacherId=${ABRAR.id}&durationMin=45&studentIds=${STUDENT_ID}`,
      );
      expect(screen.getByText(t.booking.outsideHours)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
      await screen.findByRole('status');
      expect(bookingBodies(apiSend)[0]).toMatchObject({
        outsideHours: true,
        startsAt: NOON,
        byday: [1],
        startTimeLocal: '12:00',
      });
    },
  );

  it('a clash with the flag is still shown as a clash', async () => {
    const clash = new ApiError(409, {
      code: 'conflict',
      message: 'conflict',
      conflicts: [{ kind: 'teacher_busy', startsAt: NOON, endsAt: NOON, lessonId: 'l' }],
    });
    routeSend(apiSend, [clash]);
    renderTrial();
    await pickOutsideNoon();
    fireEvent.click(screen.getByRole('button', { name: t.booking.submit }));
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  });
});
