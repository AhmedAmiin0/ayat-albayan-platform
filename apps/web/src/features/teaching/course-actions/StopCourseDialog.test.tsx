import { courseStopLessonsText } from '@ab/client-core';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { SUB } from './course-actions-fixture';
import { StopCourseDialog } from './StopCourseDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const words = t.courseActions.stop;
const PREVIEW = {
  subscriptionId: SUB,
  futureLessons: 4,
  activeRules: 1,
  paid: 290,
  currency: 'SAR',
};

function open(stopped: unknown = null) {
  apiFetch.mockResolvedValue({ ...PREVIEW, stopped });
  const onDone = vi.fn();
  renderWithClient(
    <StopCourseDialog studentId="s1" subscriptionId={SUB} onClose={vi.fn()} onDone={onDone} />,
  );
  const dialog = within(screen.getByRole('dialog', { name: words.title }));
  return { dialog, onDone };
}

const confirm = () => screen.queryByRole<HTMLButtonElement>('button', { name: words.confirm });

describe('StopCourseDialog «إلغاء الاشتراك» (owner 2026-10-30)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('says what happens: lessons cancelled, schedule ends, money and history kept, churned', async () => {
    const { dialog } = open();
    expect(await dialog.findByText(courseStopLessonsText(words.lessons, PREVIEW))).toBeTruthy();
    for (const line of [words.schedule, words.history, words.status])
      expect(dialog.getByText(line)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/students/s1/course-stop?subscriptionId=${SUB}`);
  });

  it('needs a reason, then posts it trimmed with one request id and closes with «done»', async () => {
    const { dialog, onDone } = open();
    await dialog.findByText(words.schedule);
    expect(confirm()?.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: '  سفر الأسرة ' } });
    apiSend.mockResolvedValue({ subscriptionId: SUB, cancelledLessons: 4, endedRules: 1 });
    fireEvent.click(confirm() as HTMLButtonElement);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-stop', {
      subscriptionId: SUB,
      reason: 'سفر الأسرة',
      clientRequestId: expect.any(String),
    });
  });

  it('a 409 already_cancelled reads in Arabic and the sheet stays', async () => {
    const { dialog, onDone } = open();
    await dialog.findByText(words.schedule);
    fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: 'سفر' } });
    apiSend.mockRejectedValue(new ApiError(409, { code: 'already_cancelled' }));
    fireEvent.click(confirm() as HTMLButtonElement);
    expect(await dialog.findByText(t.courseActions.errors.already_cancelled)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('an already stopped package shows who-when-why and no confirm', async () => {
    const { dialog } = open({ at: '2026-10-20T10:00:00Z', by: 'a1', reason: 'انتقال' });
    expect(await dialog.findByText(words.stoppedReason.replace('{reason}', 'انتقال'))).toBeTruthy();
    expect(confirm()?.disabled ?? true).toBe(true);
  });
});
