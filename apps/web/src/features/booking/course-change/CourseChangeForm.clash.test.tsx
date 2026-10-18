import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { BookingModeContext, type BookingMode } from '../mode';
import { CHANGE_VIEW, changeBodies, CHECK, CLASH, NOW, routeChange, routeChangeSend } from './change-fixture';
import { CourseChangeForm } from './CourseChangeForm';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const reasonField = () => screen.queryByLabelText(new RegExp(t.booking.courseChange.overrideReason));

async function toReview(mode: BookingMode, onDone = vi.fn()) {
  renderWithClient(
    <BookingModeContext.Provider value={mode}>
      <CourseChangeForm view={CHANGE_VIEW} onDone={onDone} />
    </BookingModeContext.Provider>,
  );
  await screen.findAllByRole('button', { name: /17:00/ });
  fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
  return onDone;
}

describe('«تغيير أيام الحلقات» over a clash (owner 2026-10-18, R-SCH-04)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    routeChange(apiFetch);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the assistant: the clash listed with only «اختر موعدًا آخر», no reason, no save', async () => {
    routeChangeSend(apiSend, { ...CHECK, conflicts: [CLASH] });
    await toReview('sales');
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
    expect(reasonField()).toBeNull();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.overrideSave })).toBeNull();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.submit })).toBeNull();
  });

  it('the assistant: a 409 conflict on save shows the clash, still without an override', async () => {
    routeChangeSend(apiSend, CHECK, [new ApiError(409, { code: 'conflict', conflicts: [CLASH] })]);
    await toReview('sales');
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.submit }));
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    expect(reasonField()).toBeNull();
  });

  it('the admin: a reason field, then the change saved with override.reason on /booking/course/change', async () => {
    routeChangeSend(apiSend, { ...CHECK, conflicts: [CLASH] });
    const onDone = await toReview('admin');
    const reason = await screen.findByLabelText(new RegExp(t.booking.courseChange.overrideReason));
    fireEvent.change(reason, { target: { value: 'طلب ولي الأمر' } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.overrideSave }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.booking.courseChange.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/course/change/check', expect.anything());
    expect(changeBodies(apiSend)[0]).toMatchObject({ override: { reason: 'طلب ولي الأمر' } });
  });
});
