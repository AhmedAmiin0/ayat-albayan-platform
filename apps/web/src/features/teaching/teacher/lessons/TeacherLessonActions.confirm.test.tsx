import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherLessonActions } from './TeacherLessonActions';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

// Monday 5 Oct 13:00Z; now is Saturday 3 Oct: open and ahead.
const AHEAD = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z' });
const w = t.teacherBoard;

function renderActions(l = AHEAD, onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherLessonActions lesson={l} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('TeacherLessonActions — «سأحضر» (docs/46 C4)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('posts her own confirm, then shows the chip instead of the button', async () => {
    apiSend.mockResolvedValue({ ...AHEAD, teacher_confirmed_at: '2026-10-03T09:00:00.000Z' });
    const onDone = renderActions();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.confirmedOk));
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/b/confirm-attendance');
    expect(screen.getByText(w.confirmedChip)).toBeTruthy();
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
  });

  it('already confirmed: the chip, no button; cancel still offered', () => {
    renderActions({ ...AHEAD, teacher_confirmed_at: '2026-10-02T09:00:00.000Z' });
    expect(screen.getByText(w.confirmedChip)).toBeTruthy();
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
    expect(screen.getByRole('button', { name: w.cancel })).toBeTruthy();
  });

  it('a confirmed lesson that started, was held or was cancelled: no chip (review 11-11)', () => {
    const at = '2026-10-02T09:00:00.000Z';
    renderActions(lesson({ id: 'c', starts_at: '2026-10-03T08:00:00.000Z', teacher_confirmed_at: at }));
    expect(screen.queryByText(w.confirmedChip)).toBeNull();
  });

  it('a cancelled confirmed lesson: no chip', () => {
    renderActions({ ...AHEAD, status: 'cancelled_by_teacher', teacher_confirmed_at: '2026-10-02T09:00:00.000Z' });
    expect(screen.queryByText(w.confirmedChip)).toBeNull();
  });

  it('409 lesson_started says the lesson began', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started', message: 'lesson_started' }));
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    expect(await screen.findByText(w.lessonStarted)).toBeTruthy();
  });

  it('any other refusal asks to try again', async () => {
    apiSend.mockRejectedValue(new ApiError(500, { code: 'boom', message: 'boom' }));
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    expect(await screen.findByText(w.actionFailed)).toBeTruthy();
  });

  it('a started or closed lesson offers neither step', () => {
    renderActions(lesson({ id: 'c', starts_at: '2026-10-03T08:00:00.000Z' }));
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: w.cancel })).toBeNull();
  });
});
