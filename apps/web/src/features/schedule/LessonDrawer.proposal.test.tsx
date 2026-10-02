import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));

const PENDING = { id: 'p1', proposed_starts_at: '2026-10-06T15:30:00.000Z', note: 'عندي ظرف', created_at: '2026-10-03T08:00:00.000Z' };
const CLASH = { kind: 'outside_availability' as const, startsAt: '2026-11-01T14:00:00.000Z', endsAt: '2026-11-01T14:45:00.000Z' };

function renderDrawer(l: LessonView, onClose = vi.fn()) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LessonDrawer lesson={l} onClose={onClose} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, onClose, drawer: screen.getByRole('dialog') };
}

describe('LessonDrawer — teacher proposals and generated clashes (R-SCH-08, R-SCH-04)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('approving a proposal over a clash needs a reason, then moves the lesson', async () => {
    apiSend
      .mockRejectedValueOnce(new ApiError(409, { code: 'conflict', message: 'conflict', conflicts: [CLASH] }))
      .mockResolvedValueOnce(lesson());
    const { drawer, onDone } = renderDrawer(lesson({ pending_proposal: PENDING }));
    const box = within(drawer).getByRole('region', { name: t.lessons.proposal.title });
    expect(within(box).getByText(/الثلاثاء 6 أكتوبر 18:30/)).toBeTruthy();
    expect(within(box).getByText(/عندي ظرف/)).toBeTruthy();
    fireEvent.click(within(box).getByRole('button', { name: t.lessons.proposal.approve }));
    expect(await within(box).findByText(t.booking.conflictTitle)).toBeTruthy();
    fireEvent.change(within(box).getByLabelText(t.booking.overrideReason), { target: { value: 'ولي الأمر موافق' } });
    fireEvent.click(within(box).getByRole('button', { name: t.booking.override }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.proposal.approved));
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lesson-proposals/p1/approve', { override: { reason: 'ولي الأمر موافق' } });
  });

  it('rejecting only answers the teacher', async () => {
    apiSend.mockResolvedValue(lesson());
    const { drawer, onDone } = renderDrawer(lesson({ pending_proposal: PENDING }));
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.proposal.reject }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.proposal.rejected));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lesson-proposals/p1/reject');
  });

  it('a lesson the daily job generated over a clash says so, with the teacher clock', () => {
    const { drawer } = renderDrawer(lesson({ conflicts: [CLASH] }));
    expect(within(drawer).getByText(t.schedule.generatedConflict)).toBeTruthy();
    expect(within(drawer).getByText(/عند المعلم\/ة 16:00 بتوقيت القاهرة/)).toBeTruthy();
  });

  it('switching to a form moves focus into it; Esc still closes when focus was lost', () => {
    const { drawer, onClose } = renderDrawer(lesson({ starts_at: '2026-10-10T14:00:00.000Z' }));
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.cancelSubmit }));
    expect(document.activeElement).toBe(within(drawer).getByRole('group', { name: t.lessons.cancelTitle }));
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
