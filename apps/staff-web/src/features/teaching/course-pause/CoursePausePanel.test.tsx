import { addDays, riyadhToday, type CoursePauseView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { CoursePausePanel } from './CoursePausePanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['courses.pause'] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const today = riyadhToday();
const words = t.coursePause;
const PAUSE: CoursePauseView = {
  id: 'p1', from_date: today, until_date: addDays(today, 9), reason: 'سفر الأسرة', created_at: `${today}T08:00:00Z`,
  created_by_name: 'سارة', resumed_at: null, extended_days: null,
};

function show(open: CoursePauseView | null, history: CoursePauseView[] = []) {
  apiFetch.mockResolvedValue({ open, history });
  const onDone = vi.fn();
  renderWithClient(<CoursePausePanel studentId="s1" onDone={onDone} />);
  return { onDone };
}

describe('CoursePausePanel: the banner', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    perms.list = ['courses.pause'];
  });

  it('a pause with an end: «حتى …» and the reason', async () => {
    show(PAUSE);
    expect(await screen.findByText(words.bannerUntil.replace('{date}', dateLabel(PAUSE.until_date ?? '')))).toBeTruthy();
    expect(screen.getByText(words.bannerReason.replace('{reason}', 'سفر الأسرة'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/course-pause');
  });

  it('open-ended and starting later: «حتى الاستئناف» and «يبدأ الإيقاف في …»', async () => {
    const later = addDays(today, 3);
    show({ ...PAUSE, from_date: later, until_date: null, reason: null });
    expect(await screen.findByText(words.bannerOpen)).toBeTruthy();
    expect(screen.getByText(words.bannerFrom.replace('{date}', dateLabel(later)))).toBeTruthy();
  });

  it('nothing for a student never paused; the history only when there is one', async () => {
    show(null, [{ ...PAUSE, id: 'p0', resumed_at: `${today}T09:00:00Z`, extended_days: 4 }]);
    expect(await screen.findByText(words.history)).toBeTruthy();
    expect(screen.getByText(words.historyDays.replace('{n}', '4'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: words.resume })).toBeNull();
  });

  it('without courses.pause the banner has no actions', async () => {
    perms.list = [];
    show(PAUSE);
    expect(await screen.findByText(words.bannerReason.replace('{reason}', 'سفر الأسرة'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: words.resume })).toBeNull();
  });

  it('«استئناف» asks first, then POST …/resume and the conflicts toast', async () => {
    const { onDone } = show(PAUSE);
    fireEvent.click(await screen.findByRole('button', { name: words.resume }));
    const dialog = within(screen.getByRole('dialog', { name: words.resumeTitle }));
    expect(dialog.getByText(words.resumeBody)).toBeTruthy();
    apiSend.mockResolvedValue({ pause: PAUSE, cancelled: 0, left: 0, reopened: 3, conflicts: 2 });
    fireEvent.click(dialog.getByRole('button', { name: words.resumeConfirm }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.resumedConflicts.replace('{n}', '2')));
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause/resume');
  });

  it('«تغيير نهاية الإيقاف»: emptied = until resume, PATCH …/until', async () => {
    const { onDone } = show(PAUSE);
    fireEvent.click(await screen.findByRole('button', { name: words.changeUntil }));
    const dialog = within(screen.getByRole('dialog', { name: words.changeUntilTitle }));
    fireEvent.change(dialog.getByLabelText(words.until), { target: { value: '' } });
    apiSend.mockResolvedValue({ pause: PAUSE, cancelled: 0, left: 0, reopened: 0, conflicts: 0 });
    fireEvent.click(dialog.getByRole('button', { name: words.save }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.saved));
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/students/s1/course-pause/until', { untilDate: null });
  });
});
