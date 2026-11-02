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
const AUTO_HELD: LessonView = { ...lesson({ id: 'l-7', status: 'completed' }), auto_held: true };

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

describe('LessonDrawer without a lesson confirmation (owner 2026-11-02)', () => {
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

  it('«لم تنعقد؟» only on a lesson held automatically', () => {
    renderDrawer(lesson({ status: 'completed' }));
    expect(screen.queryByText(c.title)).toBeNull();
  });

  it.each([
    ['teacher', c.byTeacher],
    ['student', c.byStudent],
  ] as const)('held automatically: «%s» opens the form for this lesson, by that party', async (by, label) => {
    apiSend.mockResolvedValue([]);
    const { onDone, drawer } = renderDrawer(AUTO_HELD);
    expect(within(drawer).getByText(c.hint)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: label }));
    const form = screen.getByRole('form', { name: c.title });
    expect(within(form).queryByLabelText(t.lessons.scope.rule)).toBeNull();
    expect(within(form).queryByLabelText(t.lessons.by.admin)).toBeNull();
    fireEvent.submit(form);
    expect(screen.getByText(t.common.required)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.lessons.reason), { target: { value: 'لم يحضر المعلم' } });
    fireEvent.submit(form);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(c.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-7/cancel', { scope: 'one', by, reason: 'لم يحضر المعلم' });
  });

  it('a 409 not_auto_held reads in the lessons’ words', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'not_auto_held' }));
    renderDrawer(AUTO_HELD);
    fireEvent.click(screen.getByRole('button', { name: c.byStudent }));
    fireEvent.change(screen.getByLabelText(t.lessons.reason), { target: { value: 'سفر' } });
    fireEvent.submit(screen.getByRole('form', { name: c.title }));
    expect(await screen.findByText(t.lessons.error.not_auto_held)).toBeTruthy();
  });
});
