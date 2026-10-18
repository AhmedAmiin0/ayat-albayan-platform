import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickWednesday, SLOT } from '@/features/booking/wizard-fixture';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, routeCourse, routeCourseSend } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const nextButton = () => screen.getByRole('button', { name: t.booking.next });
const submit = () => screen.getByRole('button', { name: t.booking.submit });
const CLASH = { kind: 'teacher_busy', startsAt: SLOT, endsAt: SLOT };

/** Open the dialog, wait for the preselected teacher, then on to the slot step (its Sunday 17:00 picked). */
async function toSlotStep(): Promise<void> {
  renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
  const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
  await waitFor(() => expect(abrar).toHaveProperty('checked', true));
  await pickSlot();
}

describe('the assistant’s course: exactly the plan’s days, each with its time (owner 2026-10-18)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    routeCourse(apiFetch);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('waits for exactly 2 days, reviews each day with its time and the course end, then books without invoice', async () => {
    routeCourseSend(apiSend);
    await toSlotStep();
    expect(screen.getByText(counted(t.booking.pickNDays, 2))).toBeTruthy();
    expect(nextButton().hasAttribute('disabled')).toBe(true);
    pickWednesday();
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    expect(nextButton().hasAttribute('disabled')).toBe(false);
    next();

    const review = within(screen.getByRole('region', { name: t.booking.steps.review }));
    expect(review.getByText(t.booking.dayAt.replace('{day}', t.enums.weekday[0]).replace('{time}', '17:00'))).toBeTruthy();
    expect(review.getByText(t.booking.dayAt.replace('{day}', t.enums.weekday[3]).replace('{time}', '19:30'))).toBeTruthy();
    expect(review.getByText(counted(t.booking.courseEnds, 8).replace('{date}', dateLabel('2026-10-28')))).toBeTruthy();
    expect(review.queryByText(t.booking.meetingLink)).toBeNull();
    expect(review.queryByText(t.booking.invoice.label)).toBeNull();

    await waitFor(() => expect(submit().hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit());
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();
    const body = apiSend.mock.calls.find(([, path]) => path === '/sales/booking')?.[2];
    expect(body).toMatchObject({
      studentIds: [COURSE_STUDENT_ID],
      kind: 'package',
      package: '8',
      durationMin: 45,
      byday: [0, 3],
      startTimeLocal: '17:00',
      dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }],
      meetingLink: null,
    });
    expect(body).not.toHaveProperty('invoice');
    expect(body).not.toHaveProperty('override');
    // No invoice to show and no second subscription to offer.
    expect(apiFetch.mock.calls.some(([path]) => String(path).includes('invoice'))).toBe(false);
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
  });

  it('removing a day goes back below the count: «التالي» waits again', async () => {
    routeCourseSend(apiSend);
    await toSlotStep();
    pickWednesday();
    fireEvent.click(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[3]) }));
    expect(nextButton().hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[3]) })).toBeNull();
  });

  it('a clash in any week keeps «احجز» disabled, with no override', async () => {
    routeCourseSend(apiSend, { conflicts: [CLASH] });
    await toSlotStep();
    pickWednesday();
    expect(await screen.findByText(t.booking.seriesCheck.replace('{n}', '1'))).toBeTruthy();
    next();
    await screen.findByRole('region', { name: t.booking.steps.review });
    expect(submit().hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: t.booking.override })).toBeNull();
  });
});
