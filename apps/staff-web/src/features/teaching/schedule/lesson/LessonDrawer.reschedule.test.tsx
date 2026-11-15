import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const L = lesson({ id: 'l-1', starts_at: '2026-10-04T14:00:00.000Z' }); // Sun 17:00 Riyadh
const BUSY = '2026-10-05T14:00:00.000Z'; // Mon 17:00, another lesson there
const FREE = '2026-10-06T14:00:00.000Z'; // Tue 17:00
const slot = (starts_at: string, busy: boolean) => ({
  starts_at,
  ends_at: starts_at,
  conflicts: busy ? [{ kind: 'teacher_busy', startsAt: starts_at, endsAt: starts_at }] : [],
});

function renderDrawer() {
  const slots = { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [slot(BUSY, true), slot(FREE, false)] };
  // The drawer also asks for the booking's invoice (R-PAY-03): none here.
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/invoices') ? [] : slots));
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LessonDrawer lesson={L} onClose={onClose} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, onClose };
}

const pick = async (day: string) => {
  const region = await screen.findByRole('region', { name: new RegExp(`^${day} `) });
  fireEvent.click(within(region).getByRole('button', { name: /17:00/ }));
};

describe('LessonDrawer reschedule (R-SCH-07, journey 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('busy slot → conflict in Arabic → another slot → moved', async () => {
    apiSend
      .mockRejectedValueOnce(
        new ApiError(409, {
          code: 'conflict',
          message: 'conflict',
          conflicts: [{ kind: 'teacher_busy', startsAt: BUSY, endsAt: BUSY }],
        }),
      )
      .mockResolvedValueOnce(lesson({ id: 'l-2', starts_at: FREE }));
    const { onDone, onClose } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: t.lessons.event.reschedule }));
    const slotsCall = String(apiFetch.mock.calls.find(([p]) => String(p).startsWith('/booking/slots'))?.[0]);
    expect(slotsCall).toContain('/booking/slots?teacherId=t-abrar');
    expect(slotsCall).toContain('durationMin=45&studentIds=s-1');

    await pick(t.enums.weekday[1]);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    expect(screen.getByText(/المعلم\/ة مشغول\/ة بحلقة أخرى/).textContent).toContain('17:00');
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/reschedule', { scope: 'one', startsAt: BUSY });

    fireEvent.click(screen.getByRole('button', { name: t.booking.changeSlot }));
    expect(screen.queryByText(t.booking.conflictTitle)).toBeNull();
    await pick(t.enums.weekday[2]);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.rescheduled));
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/l-1/reschedule', { scope: 'one', startsAt: FREE });
    expect(onClose).toHaveBeenCalled();
  });

  it('can book over the conflict with a reason', async () => {
    apiSend
      .mockRejectedValueOnce(new ApiError(409, { code: 'conflict', conflicts: [{ kind: 'time_off', startsAt: BUSY, endsAt: BUSY }] }))
      .mockResolvedValueOnce(lesson({ id: 'l-2', starts_at: BUSY }));
    const { onDone } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: t.lessons.event.reschedule }));
    await pick(t.enums.weekday[1]);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
    fireEvent.change(await screen.findByLabelText(t.booking.overrideReason), { target: { value: 'طلب ولي الأمر' } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.override }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/l-1/reschedule', {
      scope: 'one',
      startsAt: BUSY,
      override: { reason: 'طلب ولي الأمر' },
    });
  });

  it('words a slot_taken refusal', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(409, { code: 'slot_taken', message: 'slot_taken' }));
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: t.lessons.event.reschedule }));
    await pick(t.enums.weekday[2]);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
    expect(await screen.findByText(t.lessons.slotTaken)).toBeTruthy();
  });
});
