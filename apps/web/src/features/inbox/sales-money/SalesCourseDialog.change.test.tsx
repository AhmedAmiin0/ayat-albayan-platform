import { counted } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK, routeChangeSend } from '@/features/booking/course-change/change-fixture';
import { ABRAR, SLOT } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, NEXT_SUN, NEXT_SUN_LATER, NEXT_WED, PREVIOUS, RENEWAL_VIEW, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

// The course to change, booked ahead from Sunday 11 October (its own first week, after today).
const CURRENT = { ...PREVIOUS, startsOn: '2026-10-11', opensOn: '2026-10-11', endsOn: '2026-11-07', running: false };
const RUNNING = { ...COURSE_VIEW, blocked: 'course_exists' as const, current: CURRENT };
const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
const changeButton = () => screen.findByRole('button', { name: t.booking.courseChange.changeDays });
const weekdayDay = (weekday: 0 | 3, date: number) => new RegExp(`^${t.enums.weekday[weekday]} ${date} `);
const day = (weekday: 0 | 3, date: number) => screen.findByRole('region', { name: weekdayDay(weekday, date) });

/** routeRenewal plus this week's Sunday 4 October 17:00 among the free slots. */
function routeWithToday(view: typeof RUNNING): void {
  routeRenewal(apiFetch, view);
  const base = apiFetch.getMockImplementation();
  const slots = [SLOT, NEXT_SUN, NEXT_SUN_LATER, NEXT_WED].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] }));
  apiFetch.mockImplementation((path: string) =>
    path.startsWith('/sales/booking/slots') ? Promise.resolve({ teacher_tz: 'Africa/Cairo', step_min: 45, slots }) : base?.(path),
  );
}

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

  it('a pending change (its new days start later, the old ones still run): running, the grid opens on the prefilled picks\' week', async () => {
    routeWithToday({ ...RUNNING, current: { ...CURRENT, running: true } });
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
    fireEvent.click(await changeButton());
    // The picks start on the new set's Sunday 11 October: its week opens, with them pressed.
    const sun11 = await day(0, 11);
    expect(within(sun11).getByRole('button', { name: /17:00/ }).getAttribute('aria-pressed')).toBe('true');
    expect(within(await day(3, 14)).getByRole('button', { name: /19:30/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('region', { name: weekdayDay(0, 4) })).toBeNull();
    // «الأسبوع السابق» reaches this week: the old Sunday 4 October slot is there, not pressed.
    fireEvent.click(screen.getByRole('button', { name: t.schedule.prevWeek }));
    const sun4 = await day(0, 4);
    expect(within(sun4).getByRole('button', { name: /17:00/ }).getAttribute('aria-pressed')).toBe('false');
  });

  it('a running course late in the Riyadh week (Friday 9 October) opens on its picks\' week, picks pressed', async () => {
    vi.setSystemTime(new Date('2026-10-09T09:00:00.000Z'));
    routeRenewal(apiFetch, { ...RUNNING, current: { ...CURRENT, startsOn: '2026-09-13', opensOn: '2026-10-09', running: true } });
    openDialog();
    fireEvent.click(await changeButton());
    expect(within(await day(0, 11)).getByRole('button', { name: /17:00/ }).getAttribute('aria-pressed')).toBe('true');
    expect(within(await day(3, 14)).getByRole('button', { name: /19:30/ }).getAttribute('aria-pressed')).toBe('true');
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
