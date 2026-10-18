import { counted } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK, routeChangeSend } from '@/features/booking/course-change/change-fixture';
import { ABRAR } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, NEXT_SUN_LATER, PREVIOUS, RENEWAL_VIEW, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

// The course to change, booked ahead from Sunday 11 October (its own first week, after today).
const CURRENT = { ...PREVIOUS, startsOn: '2026-10-11', endsOn: '2026-11-07', running: false };
const RUNNING = { ...COURSE_VIEW, blocked: 'course_exists' as const, current: CURRENT };
const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
const changeButton = () => screen.findByRole('button', { name: t.booking.courseChange.changeDays });

describe('«تغيير أيام الحلقات» from the sales chat (owner 2026-10-18)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a course running today is called running', async () => {
    routeRenewal(apiFetch, { ...RUNNING, current: { ...CURRENT, startsOn: '2026-09-13', running: true } });
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
    expect(screen.queryByText(t.booking.courseChange.upcoming)).toBeNull();
  });

  it('a pending change (its new days start later, the old ones still run): running, changed again from today', async () => {
    routeRenewal(apiFetch, { ...RUNNING, current: { ...CURRENT, running: true } });
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
    fireEvent.click(await changeButton());
    // The grid opens on this week (Sunday 4 October), not on the new set's 11 October.
    expect(await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} 4 `) })).toBeTruthy();
    expect(screen.queryByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} 11 `) })).toBeNull();
  });

  it('a course booked ahead offers the change instead of only the refusal, from its own first week, then saves it here', async () => {
    routeRenewal(apiFetch, RUNNING);
    routeChangeSend(apiSend, CHECK);
    openDialog();
    // Booked ahead: it has not started yet, so it is not called «جارية».
    expect(await screen.findByText(t.booking.courseChange.upcoming)).toBeTruthy();
    expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
    fireEvent.click(await changeButton());
    const sunday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[0]} `) });
    expect(within(sunday).getByRole('button', { name: /17:00/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(sunday).getByRole('button', { name: /18:00/ }));
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    expect(await screen.findByText(t.booking.courseChange.done)).toBeTruthy();
    const body = { subscriptionId: PREVIOUS.subscriptionId, startsOn: '2026-10-11', startsAt: NEXT_SUN_LATER };
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change', expect.objectContaining(body));
  });

  it('a course_exists view without the course to change keeps the refusal', async () => {
    routeRenewal(apiFetch, { ...RUNNING, current: null });
    openDialog();
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.changeDays })).toBeNull();
  });

  it('a renewal with a course to change offers it beside «تابِع بنفس الأيام», and back from the form', async () => {
    routeRenewal(apiFetch, { ...RENEWAL_VIEW, current: CURRENT });
    openDialog();
    expect(await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeTruthy();
    fireEvent.click(await changeButton());
    expect(await screen.findByText(t.booking.courseChange.pickNew)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.back }));
    expect(await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeTruthy();
  });

  it('a bookable course with a course to change offers it beside the wizard', async () => {
    routeRenewal(apiFetch, { ...COURSE_VIEW, current: CURRENT });
    openDialog();
    expect(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) })).toBeTruthy();
    fireEvent.click(await changeButton());
    expect(await screen.findByText(t.booking.courseChange.pickNew)).toBeTruthy();
  });
});
