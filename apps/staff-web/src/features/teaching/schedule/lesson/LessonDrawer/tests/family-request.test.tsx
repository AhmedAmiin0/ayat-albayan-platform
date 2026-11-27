import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { ProposalsPanel } from '@/features/teaching/schedule/reschedule/proposals/ProposalsPanel';
import { answered, lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { LessonDrawer } from '@/features/teaching/schedule/lesson/LessonDrawer/LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const ASKED = {
  id: 'p1',
  proposed_starts_at: '2026-10-06T15:30:00.000Z',
  note: 'لدى الطالب اختبار',
  created_at: '2026-10-03T08:00:00.000Z',
  requested_by: 'family' as const,
};
const P = t.lessons.proposal;
const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('a family «اطلب موعدًا آخر» on the staff web (owner 2026-11-17)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
    apiFetch.mockReset();
  });

  it('the panel tells a family request from a teacher proposal', async () => {
    const teacher = { ...ASKED, id: 'p2', requested_by: 'teacher' as const };
    apiFetch.mockResolvedValue(
      [lesson({ pending_proposal: ASKED }), lesson({ id: 'l2', pending_proposal: teacher })].map(answered),
    );
    wrap(<ProposalsPanel onOpen={vi.fn()} />);
    expect(await screen.findByText(P.fromFamily)).toBeTruthy();
    expect(screen.getByText(P.fromTeacher)).toBeTruthy();
  });

  it("the drawer says the family's ask and note; «ارفض الطلب» sends the note they read", async () => {
    apiSend.mockResolvedValue(answered(lesson()));
    const onDone = vi.fn();
    const asked = lesson({ pending_proposal: ASKED });
    wrap(<LessonDrawer lesson={asked} onClose={vi.fn()} onDone={onDone} />);
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText(P.familyNote.replace('{note}', ASKED.note))).toBeTruthy();
    fireEvent.change(within(drawer).getByLabelText(P.decisionNote), { target: { value: 'لا يتوفر وقت' } });
    fireEvent.click(within(drawer).getByRole('button', { name: P.rejectRequest }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(P.requestRejected));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lesson-proposals/p1/reject', { note: 'لا يتوفر وقت' });
  });

  it('«اختر موعدًا آخر» opens the move form; the box says when the family sent it', async () => {
    apiFetch.mockResolvedValue({ teacher_tz: 'Asia/Riyadh', step_min: 30, slots: [] });
    const asked = lesson({ pending_proposal: ASKED });
    wrap(<LessonDrawer lesson={asked} onClose={vi.fn()} onDone={vi.fn()} />);
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText(new RegExp(P.sentAt.replace('{when}', '')))).toBeTruthy();
    expect(within(drawer).getByText(P.pickOtherHint)).toBeTruthy();
    fireEvent.click(within(drawer).getByRole('button', { name: P.pickOther }));
    expect(await within(drawer).findByRole('heading', { name: t.lessons.rescheduleTitle })).toBeTruthy();
  });
});
