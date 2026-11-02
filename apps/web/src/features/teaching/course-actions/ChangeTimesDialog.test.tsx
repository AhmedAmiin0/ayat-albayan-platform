import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ChangeTimesDialog } from './ChangeTimesDialog';
import { MON, NOW, routeCourse, routeSend, SUB } from './course-actions-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const day = (n: 0 | 1 | 3) =>
  screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[n]} `) });

function open(mode: 'admin' | 'sales' = 'sales') {
  const onDone = vi.fn();
  renderWithClient(
    <ChangeTimesDialog
      studentId="s1"
      subscriptionId={SUB}
      mode={mode}
      onClose={vi.fn()}
      onDone={onDone}
    />,
  );
  return onDone;
}

/** Monday 18:00 instead of Sunday, then «التالي». */
async function swapAndNext() {
  fireEvent.click(within(await day(1)).getByRole('button', { name: /18:00/ }));
  const remove = t.booking.removeDay.replace('{day}', t.enums.weekday[0]);
  fireEvent.click(screen.getByRole('button', { name: remove }));
  fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
}

describe('ChangeTimesDialog «تغيير موعد الحلقات» (owner 2026-10-30)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    routeCourse(apiFetch);
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('checks and saves on the profile course-times routes; the remaining count is kept', async () => {
    routeSend(apiSend);
    const onDone = open();
    await swapAndNext();
    expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    const check = apiSend.mock.calls.find(
      ([, p]) => p === '/students/s1/course-times/change/check',
    );
    expect(check?.[2]).toMatchObject({ subscriptionId: SUB, byday: [1, 3], startsAt: MON });
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.courseActions.times.done));
    expect(apiSend).toHaveBeenCalledWith(
      'POST',
      '/students/s1/course-times/change',
      expect.objectContaining({
        byday: [1, 3],
        clientRequestId: expect.any(String),
      }),
    );
    expect(apiFetch).toHaveBeenCalledWith(`/students/s1/course-times/change?subscriptionId=${SUB}`);
  });

  it("the slot grid is the booking mode's (sales: /sales/booking/slots)", async () => {
    open();
    await day(0);
    const paths = apiFetch.mock.calls.map(([p]) => String(p));
    expect(paths.some((p) => p.startsWith('/sales/booking/slots'))).toBe(true);
  });

  it('a refused view names its code (404 course_not_found)', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, { code: 'course_not_found' }));
    open('admin');
    expect(await screen.findByText(t.courseActions.errors.course_not_found)).toBeTruthy();
  });
});
