import { counted, type LessonView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK, COURSE, NOW, routeChange, routeChangeSend, swapSundayForMonday } from '@/features/teaching/booking/course-change/change-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const COURSE_LESSON = { ...lesson(), course_subscription_id: COURSE.subscriptionId };
const action = () => screen.queryByRole('button', { name: t.booking.courseChange.changeDays });

function openDrawer(l: LessonView = COURSE_LESSON) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  renderWithClient(<LessonDrawer lesson={l} onClose={onClose} onDone={onDone} />);
  return { onDone, onClose };
}

describe('«تغيير أيام الحلقات» in the admin’s lesson drawer (owner 2026-10-18)', () => {
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

  it('only on an open lesson of an assistant course', () => {
    openDrawer(lesson());
    expect(action()).toBeNull();
  });

  it('a held lesson of the course offers no change', () => {
    openDrawer({ ...lesson({ status: 'completed' }), course_subscription_id: COURSE.subscriptionId });
    expect(action()).toBeNull();
  });

  it('opens the form from GET /booking/course/change, saves and toasts', async () => {
    routeChangeSend(apiSend, CHECK);
    const { onDone, onClose } = openDrawer();
    const open = action();
    if (!open) throw new Error('no action');
    fireEvent.click(open);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/course/change?subscriptionId=${COURSE.subscriptionId}`);
    await screen.findAllByRole('button', { name: /17:00/ });
    await swapSundayForMonday();
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.booking.courseChange.done));
    expect(onClose).toHaveBeenCalled();
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/course/change', expect.objectContaining({ subscriptionId: COURSE.subscriptionId }));
  });

  it('«رجوع» goes back to the lesson', async () => {
    openDrawer();
    fireEvent.click(action() ?? document.body);
    await screen.findAllByRole('button', { name: /17:00/ });
    fireEvent.click(screen.getByRole('button', { name: t.booking.back }));
    expect(action()).toBeTruthy();
  });
});
