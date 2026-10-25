import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/testing/test-utils';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { BookingModeContext } from '../mode';
import { ApiError } from '@/lib/http/api';
import { CHANGE_VIEW, changeBodies, CHECK, COURSE, MON, NOW, routeChange, routeChangeSend, swapSundayForMonday } from './change-fixture';
import { currentDaysText, newDaysText } from './change-text';
import { CourseChangeForm } from './CourseChangeForm';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const day = (n: 0 | 1 | 3) => screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[n]} `) });

async function openSales(onDone = vi.fn()) {
  renderWithClient(
    <BookingModeContext.Provider value="sales">
      <CourseChangeForm view={CHANGE_VIEW} onDone={onDone} />
    </BookingModeContext.Provider>,
  );
  return onDone;
}

describe('«تغيير أيام الحلقات»: pick, review, save (owner 2026-10-18)', () => {
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

  it('opens with the current days picked, the course’s own lessons not busy (excludeCourse)', async () => {
    await openSales();
    const sunday = within(await day(0)).getByRole('button', { name: /17:00/ });
    expect(sunday.getAttribute('aria-pressed')).toBe('true');
    expect(within(await day(3)).getByRole('button', { name: /19:30/ }).getAttribute('aria-pressed')).toBe('true');
    const slots = apiFetch.mock.calls.map(([p]) => String(p)).find((p) => p.startsWith('/sales/booking/slots'));
    expect(slots).toContain(`excludeCourse=${COURSE.subscriptionId}`);
    expect(slots).toContain(`studentIds=${CHANGE_VIEW.student.id}`);
  });

  it('unchanged days are not held on the client: the series check refuses them with no_change, by its text', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'no_change' }));
    await openSales();
    await day(0);
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(t.booking.error.no_change)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
  });

  it('after the save the still-mounted check is not asked again (it would answer no_change)', async () => {
    let checks = 0;
    apiSend.mockImplementation((_m: string, path: string) => {
      if (!path.endsWith('/change/check')) return Promise.resolve({ subscriptionId: COURSE.subscriptionId, ruleIds: ['r-9'], endsOn: CHECK.endsOn });
      checks += 1;
      return checks === 1 ? Promise.resolve(CHECK) : Promise.reject(new ApiError(400, { code: 'no_change' }));
    });
    const onDone = await openSales();
    await swapSundayForMonday();
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.booking.courseChange.done));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checks).toBe(1);
    expect(screen.queryByText(t.booking.error.no_change)).toBeNull();
  });

  it('tapping another time that day replaces it; the review shows what is left and the new last lesson', async () => {
    routeChangeSend(apiSend, CHECK);
    const onDone = await openSales();
    // Monday 18:00 instead of Sunday: three days until Sunday is removed.
    fireEvent.click(within(await day(1)).getByRole('button', { name: /18:00/ }));
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[0]) }));
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    const status = await screen.findByRole('status');
    expect(within(status).getByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    const lines = within(status).getAllByRole('listitem').map((li) => li.textContent);
    const newDays = newDaysText({ byday: [1, 3], startTimeLocal: '18:00', dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }] }, COURSE.tz);
    // The current and the new days together, above what is left and the new end.
    expect(lines.slice(0, 3)).toEqual([currentDaysText(COURSE.days, COURSE.tz), newDays, counted(t.booking.courseChange.remaining, 5)]);
    expect(screen.getByText(t.booking.courseChange.newEnd.replace('{date}', dateLabel('2026-10-21')))).toBeTruthy();
    const checked = apiSend.mock.calls.find(([, path]) => path === '/sales/booking/course/change/check');
    expect(checked?.[2]).toMatchObject({ subscriptionId: COURSE.subscriptionId, byday: [1, 3], startsAt: MON });
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.booking.courseChange.done));
    const [body] = changeBodies(apiSend);
    expect(body).toMatchObject({ byday: [1, 3], startsAt: MON, clientRequestId: expect.any(String) });
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change', body);
  });

  it('a failed check names the error with «اختر موعدًا آخر» back to the grid', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'course_finished' }));
    await openSales();
    await swapSundayForMonday();
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(t.booking.error.course_finished)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.changeSlot }));
    expect(await day(0)).toBeTruthy();
  });

  it('a refused save names its code (400 no_change), never a generic retry', async () => {
    routeChangeSend(apiSend, CHECK, [new ApiError(400, { code: 'no_change' })]);
    await openSales();
    await swapSundayForMonday();
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.submit }));
    expect(await screen.findByText(t.booking.error.no_change)).toBeTruthy();
    expect(screen.queryByText(t.common.error)).toBeNull();
  });
});
