import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherLessonCard } from '@/features/teaching/teacher/lessons/TeacherLessonCard';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

// Monday 5 Oct 13:00Z; now is Saturday 3 Oct: open and ahead.
const AHEAD = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z' });
const KEY = ['lessons', 'mine', 'window'];
const CAIRO = 'Africa/Cairo';
const w = t.teacherBoard;
let server: LessonView = AHEAD;

/** The card reads its lesson from her cached list, as on the home: the confirm patches it. */
function Cached({ onDone }: { onDone: (m: string) => void }) {
  const list = useQuery({ queryKey: KEY, queryFn: () => Promise.resolve([server]) });
  const shown = list.data?.[0];
  if (!shown) return null;
  return <TeacherLessonCard lesson={shown} tz={CAIRO} fallbackLink={null} onDone={onDone} />;
}

async function renderCard(l = AHEAD, onDone = vi.fn()) {
  server = l;
  const once = { retry: false };
  const client = new QueryClient({ defaultOptions: { queries: once, mutations: once } });
  render(
    <QueryClientProvider client={client}>
      <Cached onDone={onDone} />
    </QueryClientProvider>,
  );
  await screen.findByRole('article');
  return onDone;
}

describe('TeacherLessonPeers — «سأحضر» (docs/46 C4, docs/48 optimistic)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiSend.mockReset();
  });

  it('posts her own confirm; the chip shows at once, the button goes', async () => {
    const said = { ...AHEAD, teacher_confirmed_at: '2026-10-03T09:00:00.000Z' };
    apiSend.mockImplementation(() => {
      server = said;
      return Promise.resolve(said);
    });
    const onDone = await renderCard();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    expect(await screen.findByText(w.confirmedChip)).toBeTruthy();
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.confirmedOk));
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/b/confirm-attendance');
  });

  it('already confirmed: the chip, no button; cancel still offered', async () => {
    await renderCard({ ...AHEAD, teacher_confirmed_at: '2026-10-02T09:00:00.000Z' });
    expect(screen.getByText(w.confirmedChip)).toBeTruthy();
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
    expect(screen.getByRole('button', { name: w.cancel })).toBeTruthy();
  });

  it('a started or cancelled confirmed lesson: no chip (review 11-11)', async () => {
    const at = '2026-10-02T09:00:00.000Z';
    await renderCard({ ...AHEAD, status: 'cancelled_by_teacher', teacher_confirmed_at: at });
    expect(screen.queryByText(w.confirmedChip)).toBeNull();
  });

  it('409 lesson_started rolls back and says the lesson began', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started', message: 'lesson_started' }));
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    expect(await screen.findByText(w.lessonStarted)).toBeTruthy();
    expect(screen.getByRole('button', { name: w.confirm })).toBeTruthy();
    expect(screen.queryByText(w.confirmedChip)).toBeNull();
  });

  it('any other refusal asks to try again', async () => {
    apiSend.mockRejectedValue(new ApiError(500, { code: 'boom', message: 'boom' }));
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: w.confirm }));
    expect(await screen.findByText(w.actionFailed)).toBeTruthy();
  });

  it('a started lesson offers neither step', async () => {
    await renderCard(lesson({ id: 'c', starts_at: '2026-10-03T08:00:00.000Z' }));
    expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: w.cancel })).toBeNull();
  });
});
