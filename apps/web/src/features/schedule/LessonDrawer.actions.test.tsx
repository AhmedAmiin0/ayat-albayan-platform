import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { JOUD, lesson, SUHAILA } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

function renderDrawer(l: LessonView) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, drawer: screen.getByRole('dialog') };
}

describe('LessonDrawer details and actions (R-SCH-01, R-SCH-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T15:00:00.000Z')); // the fixture lesson started an hour ago
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('titles the drawer by the students and shows each zone once', () => {
    const { drawer } = renderDrawer(lesson({ students: [SUHAILA, JOUD], starts_at: '2026-12-06T14:00:00.000Z' }));
    expect(within(drawer).getByRole('heading', { name: 'سهيلة وجود' })).toBeTruthy();
    expect(within(drawer).getByText(/عند الطالب 16:00 بتوقيت القاهرة/)).toBeTruthy();
    expect(within(drawer).getByText(/عند المعلم\/ة 16:00 بتوقيت القاهرة/)).toBeTruthy();
    expect(within(drawer).getByText('AB-0184')).toBeTruthy();
  });

  it('confirm is the one primary; it posts and reports «تم تأكيد الحلقة»', async () => {
    apiSend.mockResolvedValue(lesson({ status: 'confirmed' }));
    const { onDone } = renderDrawer(lesson({ id: 'l-9' }));
    fireEvent.click(screen.getByRole('button', { name: t.lessons.event.confirm }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.confirmed));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-9/confirm');
  });

  it('records attendance after the start, and words an invalid transition', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition', from: 'completed', event: 'mark_late' }));
    renderDrawer(lesson({ id: 'l-9', status: 'confirmed' }));
    const group = screen.getByRole('group', { name: t.teacherDash.markAttendance });
    fireEvent.click(within(group).getByRole('button', { name: t.lessons.event.mark_late }));
    expect(await screen.findByText(t.lessons.invalidTransition)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/l-9/status', { event: 'mark_late' });
  });

  it('before the start only «اعتذر مسبقًا» is offered as an outcome', () => {
    renderDrawer(lesson({ starts_at: '2026-10-08T14:00:00.000Z' }));
    const group = screen.getByRole('group', { name: t.teacherDash.markAttendance });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([t.lessons.event.excuse]);
  });

  it('a closed lesson offers no actions', () => {
    renderDrawer(lesson({ status: 'rescheduled' }));
    expect(screen.queryByRole('button', { name: t.lessons.event.reschedule })).toBeNull();
    expect(screen.queryByRole('button', { name: t.lessons.cancelSubmit })).toBeNull();
  });
});
