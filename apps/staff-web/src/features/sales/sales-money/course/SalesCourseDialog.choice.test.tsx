import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, rowInputs } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { adjustText, continueText } from './course-continue';
import { COURSE_STUDENT_ID, RENEWAL_VIEW, routeCourseSend, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale, tz: 'Asia/Riyadh' } as const;

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
const sameButton = () => screen.findByRole('button', { name: t.booking.courseChange.continueSameDays });
/** Lesson row `n` holds this date and time (empty strings: not set). */
async function rowHolds(n: number, date: string, time: string): Promise<void> {
  const row = await rowInputs(n);
  expect(row.date).toHaveProperty('value', date);
  expect(row.time).toHaveProperty('value', time);
}

describe('the renewal’s choice in «أيام الحلقات» (owner 2026-10-18)', () => {
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

  it('another day count than before: says so, no «تابِع»; «عدّل الأيام السابقة» opens the previous days to add one', async () => {
    routeRenewal(apiFetch, { ...RENEWAL_VIEW, perWeek: 3 });
    openDialog();
    expect(await screen.findByText(adjustText({ ...RENEWAL_VIEW, perWeek: 3 }, C24))).toBeTruthy();
    expect(screen.queryByText(continueText(RENEWAL_VIEW, C24))).toBeNull();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
    const adjust = await screen.findByRole('button', { name: t.booking.courseChange.adjustDays });
    await waitFor(() => expect(adjust.hasAttribute('disabled')).toBe(false));
    fireEvent.click(adjust);
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    next();
    await rowHolds(1, '2026-10-11', '17:00');
    await rowHolds(2, '2026-10-14', '19:30');
    await rowHolds(3, '', '');
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
  });

  it('another day count than before: «اختر أيامًا أخرى» opens the picker empty', async () => {
    routeRenewal(apiFetch, { ...RENEWAL_VIEW, perWeek: 3 });
    openDialog();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.pickOtherDays }));
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }));
    next();
    for (const n of [1, 2, 3]) await rowHolds(n, '', '');
  });

  it('the previous teacher no longer bookable: said on the choice, «تابِع» disabled, no empty teacher', async () => {
    routeRenewal(apiFetch, RENEWAL_VIEW, [{ ...ABRAR, has_availability: false }]);
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.teacherUnavailable)).toBeTruthy();
    expect((await sameButton()).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText(ABRAR.display_name_ar)).toBeNull();
  });

  it('not among her teachers at all: the same notice', async () => {
    routeRenewal(apiFetch, RENEWAL_VIEW, []);
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.teacherUnavailable)).toBeTruthy();
    expect((await sameButton()).hasAttribute('disabled')).toBe(true);
  });

  it('«رجوع إلى اختيار الأيام» from the wizard’s first step back to the choice', async () => {
    routeRenewal(apiFetch);
    openDialog();
    const same = await sameButton();
    await waitFor(() => expect(same.hasAttribute('disabled')).toBe(false));
    expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
    fireEvent.click(same);
    expect(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.backToChoice }));
    expect(await sameButton()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.pickOtherDays }));
    expect(await screen.findByRole('button', { name: t.booking.courseChange.backToChoice })).toBeTruthy();
  });
});
