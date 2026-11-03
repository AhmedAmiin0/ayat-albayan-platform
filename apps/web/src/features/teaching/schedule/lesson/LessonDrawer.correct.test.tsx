import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { setConfirmationRequired } from '@/lib/settings/confirmation-testing';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));

const c = t.lessons.correct;
const ENDED = '2000-01-01T10:00:00Z';
const AUTO_HELD: LessonView = { ...lesson({ id: 'l-7', status: 'completed', ends_at: ENDED }), auto_held: true };

function renderDrawer(l: LessonView, required = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={setConfirmationRequired(new QueryClient(), required)}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, drawer: screen.getByRole('dialog') };
}

afterEach(() => apiSend.mockReset());

describe('LessonDrawer: no confirmation (owner 2026-11-02) and «تصحيح الحالة» (11-03)', () => {
  it('a scheduled lesson reads «مجدولة» and offers no «تأكيد الحلقة»', () => {
    const { drawer } = renderDrawer(lesson());
    expect(within(drawer).getByText(t.lessons.noConfirm.scheduled)).toBeTruthy();
    expect(within(drawer).queryByText(t.enums.lessonStatus.scheduled)).toBeNull();
    expect(within(drawer).queryByRole('button', { name: t.lessons.event.confirm })).toBeNull();
    // Cancelling stays, with every party (teacher, admin, student).
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.cancelSubmit }));
    expect(screen.getByLabelText(t.lessons.by.student)).toBeTruthy();
  });

  it('with the confirmation on: «يحتاج تأكيد» and «تأكيد الحلقة» as before', () => {
    const { drawer } = renderDrawer(lesson(), true);
    expect(within(drawer).getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
  });

  it('a completed lesson recorded by hand offers no correction', () => {
    renderDrawer(lesson({ status: 'completed', ends_at: ENDED }));
    expect(screen.queryByText(c.outcomeTitle)).toBeNull();
  });

  it('held automatically: the three other statuses; «غائب» posts { to } and says it is done', async () => {
    apiSend.mockResolvedValue(AUTO_HELD);
    const { drawer } = renderDrawer(AUTO_HELD);
    expect(within(drawer).getByText(c.outcomeHint)).toBeTruthy();
    expect(within(drawer).queryByRole('button', { name: c.to.completed })).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: c.to.no_show }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/correct', { to: 'no_show' }));
    expect(await within(drawer).findByText(c.done)).toBeTruthy();
  });

  it('confirmation on (the default): an ended «يحتاج تأكيد» lesson offers all four', () => {
    const { drawer } = renderDrawer(lesson({ ends_at: ENDED }), true);
    for (const to of ['completed', 'no_show', 'excused', 'cancelled_by_teacher'] as const) {
      expect(within(drawer).getByRole('button', { name: c.to[to] })).toBeTruthy();
    }
  });

  it('a 409 not_auto_held reads in the lessons’ words', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'not_auto_held' }));
    renderDrawer(AUTO_HELD);
    fireEvent.click(screen.getByRole('button', { name: c.to.excused }));
    expect(await screen.findByText(t.lessons.error.not_auto_held)).toBeTruthy();
  });
});
