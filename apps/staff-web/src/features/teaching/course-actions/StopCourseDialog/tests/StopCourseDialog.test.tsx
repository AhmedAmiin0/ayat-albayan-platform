import { courseStopLessonsText } from '@ab/client-core';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError, t } from '@ab/web-kit';
import { SUB } from '@/features/teaching/course-actions/course-actions-fixture';
import { StopCourseDialog } from '@/features/teaching/course-actions/StopCourseDialog/StopCourseDialog';
import { mockCall } from '@ab/testing/mock-call';

const perms = vi.hoisted(() => ({ list: ['subscriptions.stop'] as string[] }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const words = t.courseActions.stop;
const PREVIEW = {
  subscriptionId: SUB,
  futureLessons: 4,
  activeRules: 1,
  paid: 290,
  currency: 'SAR',
  refund: { paid: 290, perLesson: 50, attended: 3, ratePercent: 100, charged: 150, refund: 140 },
  refundUnavailable: false,
  owe: { charged: 150, price: 400 },
};

function open(stopped: unknown = null) {
  mockApi.onRead(() => ({ ...PREVIEW, stopped }));
  const onDone = vi.fn();
  const chat = { phone: '+201000000000', mode: 'admin' as const };
  renderWithClient(
    <StopCourseDialog
      studentId="s1"
      subscriptionId={SUB}
      onClose={vi.fn()}
      onDone={onDone}
      chat={chat}
    />,
  );
  const dialog = within(screen.getByRole('dialog', { name: words.title }));
  return { dialog, onDone };
}

const confirm = () => screen.queryByRole<HTMLButtonElement>('button', { name: words.confirm });

describe('StopCourseDialog «إلغاء الاشتراك» (owner 2026-10-30)', () => {
  beforeEach(() => {
    mockApi.reset('read');
    mockApi.reset('write');
  });

  it('says what happens: lessons cancelled, schedule ends, money and history kept, churned', async () => {
    const { dialog } = open();
    expect(await dialog.findByText(courseStopLessonsText(words.lessons, PREVIEW))).toBeTruthy();
    for (const line of [words.schedule, words.history, words.status])
      expect(dialog.getByText(line)).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: `/students/s1/course-stop?subscriptionId=${SUB}`,
    });
  });

  it('needs a reason, posts it trimmed with one request id, then the done block', async () => {
    const { dialog, onDone } = open();
    await dialog.findByText(words.schedule);
    // An empty reason shows a clear error on confirm and nothing is sent.
    fireEvent.click(confirm() as HTMLButtonElement);
    expect(await dialog.findByText(words.reasonRequired)).toBeTruthy();
    expect(mockApi.writes()).toHaveLength(0);
    fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: '  سفر الأسرة ' } });
    const stoppedAt = '2026-11-27T10:00:00.000Z';
    const result = { subscriptionId: SUB, cancelledLessons: 4, endedRules: 1, refund: null };
    mockApi.onWrite(() => ({ ...result, studentStatus: 'churned', stoppedAt }));
    fireEvent.click(confirm() as HTMLButtonElement);
    // The status now, the next step, who was told, chat.
    expect(await screen.findByText(words.done)).toBeTruthy();
    const status = words.doneStatus.replace('{status}', t.enums.studentStatus.churned);
    for (const line of [status, words.nextTitle, words.nextTell, words.notifiedFamily])
      expect(screen.getByText(line)).toBeTruthy();
    const chat = screen.getByRole('link', { name: t.students.family.openChat });
    expect(chat.getAttribute('href')).toContain('/admin/inbox?phone=%2B201000000000');
    fireEvent.click(screen.getByRole('button', { name: words.close }));
    expect(onDone).toHaveBeenCalledWith(words.done);
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/students/s1/course-stop',
      body: {
        subscriptionId: SUB,
        reason: 'سفر الأسرة',
        clientRequestId: expect.any(String),
        owe: { choice: 'attended' },
      },
    });
  });

  it('a 409 already_cancelled reads in Arabic and the sheet stays', async () => {
    const { dialog, onDone } = open();
    await dialog.findByText(words.schedule);
    fireEvent.change(dialog.getByLabelText(words.reason), { target: { value: 'سفر' } });
    mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'already_cancelled' })));
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
