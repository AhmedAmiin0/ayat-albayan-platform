import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherLessonActions } from './TeacherLessonActions';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

const AHEAD = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z' });
const w = t.teacherBoard;

function openCancel(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherLessonActions lesson={AHEAD} onDone={onDone} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: w.cancel }));
  return { onDone, dialog: screen.getByRole('dialog', { name: w.cancelTitle }) };
}

describe('TeacherLessonActions — «إلغاء الحلقة» (docs/46 C3, D3)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('the reason is required: a blank one sends nothing', () => {
    const { dialog } = openCancel();
    expect(within(dialog).getByText(w.cancelHint)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(new RegExp(w.reason)), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: w.cancelSubmit }));
    expect(within(dialog).getByText(w.reasonRequired)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('with a reason: her own route, one lesson, then the toast', async () => {
    apiSend.mockResolvedValue({ ...AHEAD, status: 'cancelled_by_teacher' });
    const { dialog, onDone } = openCancel();
    fireEvent.change(within(dialog).getByLabelText(new RegExp(w.reason)), { target: { value: ' مرض ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: w.cancelSubmit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.cancelledOk));
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/b/cancel', { reason: 'مرض' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a refusal stays in the dialog and says why', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started', message: 'lesson_started' }));
    const { dialog } = openCancel();
    fireEvent.change(within(dialog).getByLabelText(new RegExp(w.reason)), { target: { value: 'سفر' } });
    fireEvent.click(within(dialog).getByRole('button', { name: w.cancelSubmit }));
    expect(await within(dialog).findByText(w.lessonStarted)).toBeTruthy();
  });

  it('«تراجع» closes without a request', () => {
    const { dialog } = openCancel();
    fireEvent.click(within(dialog).getByRole('button', { name: w.keep }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
