import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { fakeNow, openEditTime, pick, SAVED, SCHEDULED } from './edit-time-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(async () => []), apiSend }));

const BUSY = '2026-10-05T15:00:00.000Z';
const CLASH = { kind: 'teacher_busy', startsAt: BUSY, endsAt: BUSY };
const refuse = (status: number, code: string, extra = {}) => new ApiError(status, { code, message: code, ...extra });

function moveToMonday() {
  const view = openEditTime(SCHEDULED);
  pick.day(new RegExp(`^${t.enums.weekday[1]} 5`));
  pick.time('18:00');
  pick.save();
  return view;
}

describe('«عدّل الوقت» refusals (R-SCH-11)', () => {
  fakeNow();
  afterEach(() => apiSend.mockReset());

  it('a clash shows the conflict, «اختر موعدًا آخر» goes back to the form', async () => {
    apiSend.mockRejectedValueOnce(refuse(409, 'conflict', { conflicts: [CLASH] }));
    moveToMonday();
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    expect(screen.getByText(/المعلم\/ة مشغول\/ة بحلقة أخرى/).textContent).toContain('18:00');
    expect(screen.queryByRole('button', { name: t.lessons.timeEdit.submit })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.booking.changeSlot }));
    await waitFor(() => expect(screen.queryByText(t.booking.conflictTitle)).toBeNull());
    expect(screen.getByRole('button', { name: t.lessons.timeEdit.submit })).toBeTruthy();
  });

  it('can save over the clash with a reason; the override rides on the same body', async () => {
    apiSend.mockRejectedValueOnce(refuse(409, 'conflict', { conflicts: [CLASH] })).mockResolvedValueOnce(SAVED);
    const { onDone } = moveToMonday();
    fireEvent.change(await screen.findByLabelText(t.lessons.timeEdit.overrideReasonEdit), { target: { value: 'طلب ولي الأمر' } });
    fireEvent.click(screen.getByRole('button', { name: t.lessons.timeEdit.overrideEdit }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/lessons/l-1/time', {
      expectedStartsAt: '2026-10-04T14:00:00.000Z',
      expectedEndsAt: '2026-10-04T14:45:00.000Z',
      startsAt: BUSY,
      durationMin: 45,
      notify: true,
      override: { reason: 'طلب ولي الأمر' },
    });
  });

  it('stale_time: says so and will not let this form overwrite the other admin', async () => {
    apiSend.mockRejectedValueOnce(refuse(409, 'stale_time', { starts_at: BUSY }));
    moveToMonday();
    expect(await screen.findByText(t.lessons.error.stale_time)).toBeTruthy();
    expect((screen.getByRole('button', { name: t.lessons.timeEdit.submit }) as HTMLButtonElement).disabled).toBe(true);
    pick.time('19:00'); // editing does not clear it
    expect(screen.getByText(t.lessons.error.stale_time)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it.each([
    [409, 'time_edit_not_allowed'],
    [400, 'date_in_future'],
    [400, 'correction_cross_day'],
    [400, 'reason_required'],
    [400, 'date_in_past'],
  ])('%i %s reads in Arabic, and a new pick clears it', async (status, code) => {
    apiSend.mockRejectedValueOnce(refuse(status, code));
    moveToMonday();
    expect(await screen.findByText(t.lessons.error[code as keyof typeof t.lessons.error])).toBeTruthy();
    expect((screen.getByRole('button', { name: t.lessons.timeEdit.submit }) as HTMLButtonElement).disabled).toBe(false);
    pick.time('19:00');
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('an unknown failure falls back to the generic error', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    moveToMonday();
    expect(await screen.findByText(t.common.error)).toBeTruthy();
  });
});
