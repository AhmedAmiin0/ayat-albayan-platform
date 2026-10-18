import { counted } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK, routeChangeSend } from '@/features/booking/course-change/change-fixture';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { COURSE_STUDENT_ID, COURSE_VIEW, PREVIOUS, routeRenewal } from './course-fixture';
import { SalesCourseDialog } from './SalesCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../test-utils')).MockLink }));

const RUNNING = { ...COURSE_VIEW, blocked: 'course_exists' as const, current: { ...PREVIOUS, endsOn: '2026-10-28' } };
const openDialog = () => renderWithClient(<SalesCourseDialog studentId={COURSE_STUDENT_ID} onClose={vi.fn()} />);

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

  it('a running course offers the change instead of only the refusal, then saves it here', async () => {
    routeRenewal(apiFetch, RUNNING);
    routeChangeSend(apiSend, CHECK);
    openDialog();
    expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
    expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.changeDays }));
    fireEvent.click(await screen.findByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    expect(await screen.findByText(t.booking.courseChange.done)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change', expect.objectContaining({ subscriptionId: PREVIOUS.subscriptionId }));
  });

  it('a course_exists view without the running course keeps the refusal', async () => {
    routeRenewal(apiFetch, { ...RUNNING, current: null });
    openDialog();
    expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.booking.courseChange.changeDays })).toBeNull();
  });
});
