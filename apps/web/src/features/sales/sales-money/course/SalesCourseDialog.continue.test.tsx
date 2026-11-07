import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, fillRow, next, rowInputs } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { continueText } from './course-continue';
import { COURSE_STUDENT_ID, NEXT_SUN, RENEWAL_VIEW, routeCourseSend, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale, tz: 'Asia/Riyadh' } as const;

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

/** Lesson row `n` holds this date and time (the family's wall clock). */
async function rowHolds(n: number, date: string, time: string): Promise<void> {
  const row = await rowInputs(n);
  expect(row.date).toHaveProperty('value', date);
  expect(row.time).toHaveProperty('value', time);
}
const taken = (n: 0 | 3) => t.booking.courseChange.continueTaken.replace('{day}', t.enums.weekday[n]);

/** Open the dialog, «تابِع بنفس الأيام», wait for the previous teacher, then on to the slot step. */
async function continueToSlots(): Promise<void> {
  renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
  expect(await screen.findByText(continueText(RENEWAL_VIEW, C24))).toBeTruthy();
  const same = screen.getByRole('button', { name: t.booking.courseChange.continueSameDays });
  // Enabled once the previous teacher is found among the teachers she can book.
  await waitFor(() => expect(same.hasAttribute('disabled')).toBe(false));
  fireEvent.click(same);
  const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
  await waitFor(() => expect(abrar).toHaveProperty('checked', true));
  next();
}

describe('«تابِع بنفس الأيام» in «أيام الحلقات» (owner 2026-10-18)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    routeRenewal(apiFetch);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('prefills the previous teacher and days, on the week the new course opens, and checks them', async () => {
    routeCourseSend(apiSend);
    await continueToSlots();
    await rowHolds(1, '2026-10-11', '17:00');
    await rowHolds(2, '2026-10-14', '19:30');
    expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
    const check = apiSend.mock.calls.find(([, path]) => path === '/sales/booking/check');
    expect(check?.[2]).toMatchObject({ teacherId: ABRAR.id, byday: [0, 3], startsOn: '2026-10-11', startsAt: NEXT_SUN });
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(false);
  });

  it('a prefilled day no longer free is named; another time that day replaces it', async () => {
    routeCourseSend(apiSend, { conflicts: [{ kind: 'teacher_busy', startsAt: NEXT_SUN, endsAt: NEXT_SUN }] });
    await continueToSlots();
    expect(await screen.findByText(taken(0))).toBeTruthy();
    expect(screen.queryByText(taken(3))).toBeNull();
    await rowInputs(1);
    fillRow(1, '2026-10-11', '18:00');
    await rowHolds(1, '2026-10-11', '18:00');
    await waitFor(() => expect(screen.queryByText(taken(0))).toBeNull());
    const bodies = apiSend.mock.calls.filter(([, path]) => path === '/sales/booking/check').map(([, , b]) => b as { startsAt: string });
    expect(bodies.at(-1)?.startsAt).toBe('2026-10-11T15:00:00.000Z');
  });
});
