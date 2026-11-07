import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABRAR, next, rowInputs } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, RENEWAL_VIEW, routeCourseSend, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);

describe('«اختر أيامًا أخرى» and the first course (owner 2026-10-18)', () => {
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

  it('the empty picker with the student’s teacher, still opening on the new course’s week', async () => {
    routeRenewal(apiFetch, { ...RENEWAL_VIEW, student: COURSE_VIEW.student });
    openDialog();
    fireEvent.click(await screen.findByRole('button', { name: t.booking.courseChange.pickOtherDays }));
    const abrar = await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) });
    await waitFor(() => expect(abrar).toHaveProperty('checked', true));
    next();
    // Empty rows, each date from the day the new course opens (after the previous one's last day).
    for (const n of [1, 2]) {
      const row = await rowInputs(n);
      expect(row.date).toHaveProperty('value', '');
      expect(row.time).toHaveProperty('value', '');
      expect(row.date.getAttribute('min')).toBe('2026-10-11');
    }
    expect(screen.queryByText(t.booking.seriesFree)).toBeNull();
  });

  it('no previous course: no choice, straight to the wizard', async () => {
    routeRenewal(apiFetch, COURSE_VIEW);
    openDialog();
    expect(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
  });
});
