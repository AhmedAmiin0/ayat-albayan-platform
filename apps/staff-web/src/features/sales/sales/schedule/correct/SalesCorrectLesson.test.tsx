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
const AUTO_HELD = scheduleLesson({ id: 'l-9', status: 'completed' });

function open(lesson: SalesScheduleLesson, confirmation = false) {
  renderWithQuery(<SalesLessonDrawer lesson={lesson} now={NOW} onClose={vi.fn()} />, confirmation);
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

afterEach(() => {
  cleanup();
  apiSend.mockReset();
});

describe('sales «لم تنعقد؟» (11-02) and «تصحيح حالة الحلقة» (11-03)', () => {
  it('a held lesson: the three other statuses; «غائب» posts { to }, then says it is done', async () => {
    apiSend.mockResolvedValue({ id: 'l-9', status: 'no_show' });
    const drawer = open(AUTO_HELD);
    expect(within(drawer).getByText(c.outcomeHint)).toBeTruthy();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
    expect(within(drawer).queryByRole('button', { name: c.to.completed })).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: c.to.no_show }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-9/correct', { to: 'no_show' }));
    expect(await within(drawer).findByText(c.done)).toBeTruthy();
  });

  it('with the confirmation on (the default), an ended open lesson offers all four, no «لم تنعقد؟»', () => {
    const drawer = open(ENDED, true);
    expect(within(drawer).queryByText(c.title)).toBeNull();
    for (const to of ['completed', 'no_show', 'excused', 'cancelled_by_teacher'] as const) {
      expect(within(drawer).getByRole('button', { name: c.to[to] })).toBeTruthy();
    }
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
  });

  it('a 409 not_auto_held reads in the lessons’ words', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'not_auto_held' }));
    const drawer = open(AUTO_HELD);
    fireEvent.click(within(drawer).getByRole('button', { name: c.to.excused }));
    expect(await within(drawer).findByText(t.lessons.error.not_auto_held)).toBeTruthy();
  });

  it('no confirmation required: a lesson still to come offers «لم تنعقد؟», never «تأكيد»', async () => {
    apiSend.mockResolvedValue({ id: 'l-9', status: 'cancelled_by_teacher' });
    renderWithQuery(<SalesLessonDrawer lesson={ENDED} now={new Date('2026-10-12T14:00:00.000Z')} onClose={vi.fn()} />);
    const drawer = screen.getByRole('dialog', { name: 'سهيلة' });
    expect(within(drawer).queryByRole('button', { name: a.confirm })).toBeNull();
    expect(within(drawer).getByText(c.title)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: c.byTeacher }));
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.back }));
    fireEvent.click(within(drawer).getByRole('button', { name: c.byTeacher }));
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirmCancel }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-9/cancel', { by: 'teacher' }));
  });
});
