import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ChangeTeacherDialog } from './ChangeTeacherDialog';
import { NEW_T, NOW, OLD_T, routeCourse, routeSend, SUB, SUN } from './course-actions-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const words = t.courseActions;

async function open() {
  const onDone = vi.fn();
  renderWithClient(
    <ChangeTeacherDialog
      studentId="s1"
      subscriptionId={SUB}
      mode="admin"
      onClose={vi.fn()}
      onDone={onDone}
    />,
  );
  const select = await screen.findByLabelText<HTMLSelectElement>(words.teacher.pick);
  return { onDone, select };
}

describe('ChangeTeacherDialog «تغيير المعلم» (owner 2026-10-30)', () => {
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

  it('offers every teacher but the current one; «من تاريخ» defaults to the next lesson', async () => {
    const { select } = await open();
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['', NEW_T]);
    expect(values).not.toContain(OLD_T);
    expect(screen.getByLabelText<HTMLInputElement>(words.from).value).toBe('2026-10-04');
    expect(screen.getByRole('button', { name: t.booking.next }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('same days: checks and saves with the new teacher from the next lesson', async () => {
    routeSend(apiSend);
    const { onDone, select } = await open();
    fireEvent.change(select, { target: { value: NEW_T } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
    const check = apiSend.mock.calls.find(
      ([, p]) => p === '/students/s1/course-teacher/change/check',
    );
    expect(check?.[2]).toMatchObject({
      subscriptionId: SUB,
      teacherId: NEW_T,
      byday: [0, 3],
      startsAt: SUN,
    });
    fireEvent.click(screen.getByRole('button', { name: t.booking.courseChange.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(words.teacher.done));
    expect(apiSend).toHaveBeenCalledWith(
      'POST',
      '/students/s1/course-teacher/change',
      expect.objectContaining({
        teacherId: NEW_T,
        clientRequestId: expect.any(String),
      }),
    );
  });

  it('a refused check names its code (teacher_inactive)', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'teacher_inactive' }));
    const { select } = await open();
    fireEvent.change(select, { target: { value: NEW_T } });
    fireEvent.click(screen.getByRole('button', { name: t.booking.next }));
    expect(await screen.findByText(words.errors.teacher_inactive)).toBeTruthy();
  });
});
