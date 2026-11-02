import type { SalesScheduleLesson } from '@ab/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesLessonDrawer } from '@/features/sales/sales/schedule/SalesLessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => ['lessons.confirm', 'lessons.cancel'].includes(p) }),
}));

const NOW = new Date('2026-10-12T16:00:00.000Z');
const c = t.lessons.correct;
const a = t.sales.lessonActions;
// 15:00–15:30Z: ended an half hour before NOW.
const ENDED = scheduleLesson({ id: 'l-9', status: 'scheduled' });
const AUTO_HELD = { ...scheduleLesson({ id: 'l-9', status: 'completed' }), auto_held: true };

function open(lesson: SalesScheduleLesson, confirmation = false) {
  renderWithQuery(<SalesLessonDrawer lesson={lesson} now={NOW} onClose={vi.fn()} />, confirmation);
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

afterEach(() => {
  cleanup();
  apiSend.mockReset();
});

describe('sales «لم تنعقد؟» (owner 2026-11-02)', () => {
  it.each([
    ['teacher', c.byTeacher],
    ['student', c.byStudent],
  ] as const)('held automatically: «%s», a reason, then POST …/cancel with that `by`', async (by, label) => {
    apiSend.mockResolvedValue({ id: 'l-9', status: 'excused' });
    const drawer = open(AUTO_HELD);
    expect(within(drawer).getByText(c.hint)).toBeTruthy();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: label }));
    fireEvent.change(within(drawer).getByLabelText(a.reason), { target: { value: 'سفر' } });
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirmCancel }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-9/cancel', { by, reason: 'سفر' }));
    expect(await within(drawer).findByText(c.done)).toBeTruthy();
  });

  it('no reason: only `by`; «رجوع» returns to the two choices', async () => {
    apiSend.mockResolvedValue({ id: 'l-9', status: 'cancelled_by_teacher' });
    const drawer = open(ENDED);
    expect(within(drawer).queryByText(c.hint)).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: c.byTeacher }));
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.back }));
    fireEvent.click(within(drawer).getByRole('button', { name: c.byTeacher }));
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirmCancel }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-9/cancel', { by: 'teacher' }));
  });

  it('with the confirmation on, an ended open lesson is read-only as before', () => {
    const drawer = open(ENDED, true);
    expect(within(drawer).queryByText(c.title)).toBeNull();
    expect(within(drawer).getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  });

  it('a 409 not_auto_held reads in the lessons’ words', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'not_auto_held' }));
    const drawer = open(AUTO_HELD);
    fireEvent.click(within(drawer).getByRole('button', { name: c.byStudent }));
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirmCancel }));
    expect(await within(drawer).findByText(t.lessons.error.not_auto_held)).toBeTruthy();
  });

  it('no confirmation required: a lesson still to come offers «لم تنعقد؟», never «تأكيد»', () => {
    renderWithQuery(<SalesLessonDrawer lesson={ENDED} now={new Date('2026-10-12T14:00:00.000Z')} onClose={vi.fn()} />);
    const drawer = screen.getByRole('dialog', { name: 'سهيلة' });
    expect(within(drawer).queryByRole('button', { name: a.confirm })).toBeNull();
    expect(within(drawer).getByText(c.title)).toBeTruthy();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
  });
});
