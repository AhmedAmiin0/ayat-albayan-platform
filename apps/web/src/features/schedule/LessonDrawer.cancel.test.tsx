import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

function openCancel(l: LessonView) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.lessons.cancelSubmit }));
  return onDone;
}

describe('LessonDrawer cancel (R-SCH-07)', () => {
  afterEach(() => apiSend.mockReset());

  it('needs a reason, then cancels this lesson by the chosen party', async () => {
    apiSend.mockResolvedValue([]);
    const onDone = openCancel(lesson({ id: 'l-3' }));
    const form = screen.getByRole('form', { name: t.lessons.cancelTitle });
    fireEvent.submit(form);
    expect(screen.getByText(t.common.required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(t.lessons.by.teacher));
    fireEvent.change(screen.getByLabelText(t.lessons.reason), { target: { value: 'مرض' } });
    fireEvent.submit(form);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.cancelled));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-3/cancel', { scope: 'one', by: 'teacher', reason: 'مرض' });
  });

  it('scope «هذه الحلقة وكل ما بعدها» cancels the series', async () => {
    apiSend.mockResolvedValue([]);
    const onDone = openCancel(lesson({ id: 'l-3' }));
    fireEvent.click(screen.getByLabelText(t.lessons.scope.rule));
    fireEvent.click(screen.getByLabelText(t.lessons.by.student));
    fireEvent.change(screen.getByLabelText(t.lessons.reason), { target: { value: 'سفر' } });
    fireEvent.submit(screen.getByRole('form', { name: t.lessons.cancelTitle }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.seriesCancelled));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-3/cancel', { scope: 'rule', by: 'student', reason: 'سفر' });
  });

  it('a one-off lesson (no rule) can only be cancelled alone; back returns to the details', () => {
    openCancel(lesson({ rule_id: null }));
    expect(screen.getByLabelText(t.lessons.scope.rule).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.back }));
    expect(screen.getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
  });
});
