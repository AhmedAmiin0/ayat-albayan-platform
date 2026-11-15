import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, pickSlot, pickWednesday } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, routeCourse, routeCourseSend } from './course-fixture';
import { courseTitle, subscriptionStartsText } from './course-draft';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
const courseReads = () => apiFetch.mock.calls.filter(([path]) => String(path).startsWith('/sales/booking/course')).length;

describe('«أيام الحلقات» dialog (owner 2026-10-18, R-ASST-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    routeCourseSend(apiSend);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('says why she cannot book it herself, without the wizard', async () => {
    routeCourse(apiFetch, { ...COURSE_VIEW, blocked: 'course_exists' });
    openDialog();
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${COURSE_STUDENT_ID}`);
    expect(screen.queryByRole('button', { name: t.booking.next })).toBeNull();
  });

  it('no subscription: «سجّل اشتراك الطالب أولًا»', async () => {
    routeCourse(apiFetch, { ...COURSE_VIEW, subscription: null, perWeek: null, blocked: 'subscription_required' });
    openDialog();
    expect(await screen.findByText(t.booking.courseBlocked.subscription_required)).toBeTruthy();
  });

  it('opens the wizard on the teacher step, the student’s teacher preselected, package and length fixed', async () => {
    routeCourse(apiFetch);
    openDialog();
    // Named for the child (name · code), with the subscription's start.
    const dialog = within(await screen.findByRole('dialog', { name: courseTitle(COURSE_VIEW) }));
    expect(await dialog.findByText(t.booking.courseFixed.replace('{package}', t.enums.packageSize['8']).replace('{minutes}', '45'))).toBeTruthy();
    expect(dialog.getByText(subscriptionStartsText(COURSE_VIEW.subscription ?? { starts_on: '' }))).toBeTruthy();
    expect(dialog.getByText(t.booking.stepOf.replace('{n}', '1').replace('{total}', '3'))).toBeTruthy();
    const abrar = await dialog.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    expect(apiFetch).toHaveBeenCalledWith('/sales/booking/teachers?program=quran&gender=female');
    expect(dialog.queryByText(t.booking.kind.label)).toBeNull();
  });

  it('after «احجز» a refetch of the view (now course_exists) keeps the booked panel', async () => {
    routeCourse(apiFetch);
    const client = openDialog();
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    await pickSlot();
    pickWednesday();
    await screen.findByText(t.booking.seriesFree);
    next();
    const submit = screen.getByRole('button', { name: t.booking.submit });
    await waitFor(() => expect(submit.hasAttribute('disabled')).toBe(false));
    fireEvent.click(submit);
    expect(await screen.findByText(t.booking.booked)).toBeTruthy();
    routeCourse(apiFetch, { ...COURSE_VIEW, blocked: 'course_exists' });
    await client.invalidateQueries();
    await waitFor(() => expect(courseReads()).toBeGreaterThan(1));
    expect(screen.getByText(t.booking.booked)).toBeTruthy();
    expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
  });
});
