import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, RENEWAL_VIEW, routeCourseSend, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);
const sameButton = () => screen.findByRole('button', { name: t.booking.courseChange.continueSameDays });
const pressed = async (n: 0 | 3, time: RegExp) => {
  const day = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[n]} `) });
  return within(day).getByRole('button', { name: time }).getAttribute('aria-pressed');
};

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

  it('another day count than before: no «تابِع», the picker opens on the previous days to add one', async () => {
    routeRenewal(apiFetch, { ...RENEWAL_VIEW, perWeek: 3 });
    openDialog();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.pickOtherDays }));
    expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    next();
    expect(await pressed(0, /17:00/)).toBe('true');
    expect(await pressed(3, /19:30/)).toBe('true');
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(true);
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
