import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherLessonCard } from './TeacherLessonCard';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

// Monday 5 Oct 16:00 Cairo (13:00Z); the teacher is in Cairo (UTC+3 until 29 Oct).
const MONDAY = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z', status: 'confirmed' });
const CAIRO = 'Africa/Cairo';

function renderCard(l = MONDAY, onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherLessonCard lesson={l} tz={CAIRO} fallbackLink={null} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('TeacherLessonCard — «اقترح موعدًا آخر» (R-SCH-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('proposes another day and time on the teacher clock, with a note', async () => {
    apiSend.mockResolvedValue(MONDAY);
    const onDone = renderCard();
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.proposeReschedule }));
    // A Dialog on every width (docs/48: no inline form in the card).
    expect(screen.getByRole('dialog', { name: t.teacherDash.propose.title })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.teacherDash.propose.date), { target: { value: '2026-10-06' } });
    fireEvent.change(screen.getByLabelText(t.teacherDash.propose.time), { target: { value: '18:30' } });
    fireEvent.change(screen.getByLabelText(t.teacherDash.propose.note), { target: { value: ' عندي ظرف ' } });
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.propose.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.teacherDash.propose.sent));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/b/propose', {
      startsAt: '2026-10-06T15:30:00.000Z',
      note: 'عندي ظرف',
    });
  });

  it('a refused proposal says why in Arabic', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'proposal_pending', message: 'proposal_pending' }));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.proposeReschedule }));
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.propose.submit }));
    expect(await screen.findByText(t.lessons.error.proposal_pending)).toBeTruthy();
  });

  it('the cancel dialog offers «اقترح موعدًا آخر»: it closes and opens the proposal (owner Q5)', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: t.teacherBoard.cancel }));
    const cancel = screen.getByRole('dialog', { name: t.teacherBoard.cancelTitle });
    fireEvent.click(within(cancel).getByRole('button', { name: t.teacherBoard.suggestOther }));
    expect(screen.queryByRole('dialog', { name: t.teacherBoard.cancelTitle })).toBeNull();
    expect(screen.getByRole('dialog', { name: t.teacherDash.propose.title })).toBeTruthy();
  });

  it('a pending proposal shows instead of the button, and the cancel dialog offers none', () => {
    const pending = { id: 'p1', proposed_starts_at: '2026-10-06T15:30:00.000Z', note: null, created_at: '2026-10-03T08:00:00.000Z' };
    renderCard(lesson({ ...MONDAY, pending_proposal: pending }));
    expect(screen.getByText(/اقترحت .*18:30، بانتظار رد الإدارة/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.teacherDash.proposeReschedule })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.teacherBoard.cancel }));
    const cancel = screen.getByRole('dialog', { name: t.teacherBoard.cancelTitle });
    expect(within(cancel).queryByRole('button', { name: t.teacherBoard.suggestOther })).toBeNull();
  });

  it('a completed lesson cannot be moved', () => {
    renderCard(lesson({ id: 'c', starts_at: '2026-10-01T13:00:00.000Z', status: 'completed' }));
    expect(screen.queryByRole('button', { name: t.teacherDash.proposeReschedule })).toBeNull();
  });
});
