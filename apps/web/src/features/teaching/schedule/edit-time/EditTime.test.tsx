import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { confirmLine, fakeNow, openEditTime, pick, SAVED, SCHEDULED } from './edit-time-fixture';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { LessonDetails } from '@/features/teaching/schedule/lesson/LessonDetails';
import { LessonDrawer } from '@/features/teaching/schedule/lesson/LessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const MONDAY = new RegExp(`^${t.enums.weekday[1]} 5`);
const TIMES = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.getAttribute('value'));

describe('«عدّل الوقت» on a scheduled lesson (R-SCH-11)', () => {
  fakeNow();
  afterEach(() => {
    apiSend.mockReset();
    apiFetch.mockReset();
  });
  const open = (l = SCHEDULED) => {
    apiFetch.mockResolvedValue([]);
    return openEditTime(l);
  };

  it('is offered only when the API allows it, next to the time and apart from «غيّر الموعد»', () => {
    apiFetch.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LessonDrawer lesson={lesson({ time_edit_mode: null })} onClose={vi.fn()} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: t.lessons.editTime })).toBeNull();
    expect(screen.getByRole('button', { name: t.lessons.event.reschedule })).toBeTruthy();
    expect(t.lessons.editTime).not.toBe(t.lessons.event.reschedule);
  });

  it('shows «عُدّل الوقت · كان …» once edited, in the drawer and as a tag', () => {
    const edited = lesson({
      time_edit: { at: '2026-10-03T08:00:00.000Z', reason: 'طلب ولي الأمر', was: { starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T13:45:00.000Z' } },
    });
    render(<QueryClientProvider client={new QueryClient()}><LessonDetails lesson={edited} /></QueryClientProvider>);
    expect(screen.getByText(/كان: .* 16:00/)).toBeTruthy();
    expect(screen.getByText(t.lessons.timeEdit.reasonLine.replace('{reason}', 'طلب ولي الأمر'))).toBeTruthy();
    expect(screen.getAllByText(t.lessons.timeEdit.tag)).toHaveLength(1); // the tag chip; the note starts with the same words
    expect(screen.queryByRole('button', { name: t.lessons.editTime })).toBeNull(); // no handler: read-only
  });

  it('picks day + time + length, shows before ← after, and PATCHes the same lesson', async () => {
    apiSend.mockResolvedValue({ ...SAVED, notified: 1 });
    const { onDone, onClose } = open();
    const form = screen.getByRole('region', { name: t.lessons.timeEdit.title });
    expect(within(form).getByText(t.lessons.timeEdit.vsReschedule)).toBeTruthy();
    expect(screen.getByText(t.lessons.timeEdit.unchanged)).toBeTruthy();
    expect((screen.getByRole('button', { name: t.lessons.timeEdit.submit }) as HTMLButtonElement).disabled).toBe(true);

    pick.day(MONDAY);
    pick.time('18:00');
    pick.duration(60);
    const line = confirmLine(/الأحد 4 أكتوبر 17:00 \(45 دقيقة\).*5 أكتوبر 18:00 \(60 دقيقة\)/);
    expect(line.textContent).toContain(t.schedule.viewerTime);
    expect(screen.getByText(t.lessons.timeEdit.sameLesson)).toBeTruthy();
    expect((screen.getByLabelText(t.lessons.timeEdit.notify) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(t.lessons.timeEdit.payoutWarn)).toBeNull(); // only a held lesson's payout moves

    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.timeEdit.savedNotified));
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-1/time', {
      expectedStartsAt: '2026-10-04T14:00:00.000Z',
      expectedEndsAt: '2026-10-04T14:45:00.000Z',
      startsAt: '2026-10-05T15:00:00.000Z',
      durationMin: 60,
      notify: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('«ابعت تأكيد…» can be switched off; a length-only change has nothing to send', async () => {
    apiSend.mockResolvedValue(SAVED);
    const { onDone } = open();
    pick.time('17:30');
    fireEvent.click(screen.getByLabelText(t.lessons.timeEdit.notify));
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.lessons.timeEdit.saved));
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({ startsAt: '2026-10-04T14:30:00.000Z', notify: false });
  });

  it('a length-only change shows no guardian checkbox', () => {
    open();
    pick.duration(30);
    expect(screen.queryByLabelText(t.lessons.timeEdit.notify)).toBeNull();
    expect(screen.getByText(/\(30 دقيقة\)/)).toBeTruthy();
  });

  it('today only offers later times; «تاريخ آخر» is a native date, never typed text', () => {
    open();
    pick.day(new RegExp(`^${t.enums.weekday[6]} 3`));
    const times = TIMES(screen.getByLabelText(new RegExp(t.lessons.timeEdit.time.replace('{city}', '.+'))));
    expect(times).toContain('12:15');
    expect(times).not.toContain('11:45');
    expect((screen.getByLabelText(t.lessons.timeEdit.otherDate) as HTMLInputElement).type).toBe('date');
  });

  it('a migrated lesson with an odd length (40) shows it instead of a wrong preset', () => {
    open(lesson({ minutes: 40, time_edit_mode: 'move' }));
    const select = screen.getByLabelText(t.lessons.timeEdit.duration) as HTMLSelectElement;
    expect(select.value).toBe('40');
    expect(TIMES(select)).toEqual(['30', '40', '45', '60', '90']);
  });

  it('«العودة إلى الحلقة» returns to the details', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: t.lessons.back }));
    expect(screen.getByRole('button', { name: t.lessons.editTime })).toBeTruthy();
  });
});
