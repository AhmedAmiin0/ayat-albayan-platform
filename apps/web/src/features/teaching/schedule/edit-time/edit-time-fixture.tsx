import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { TimeEditResult } from './edit-time.contract';
import { lesson } from '../lesson/lesson-fixture';
import { LessonDrawer } from '../lesson/LessonDrawer';

// Test data only (imported by EditTime*.test.tsx): the drawer opened on «عدّل الوقت».

/** Sat 3 Oct 2026, 12:00 in Cairo (UTC+3 until 29 Oct) and Riyadh. */
export const NOW = '2026-10-03T09:00:00.000Z';
/** A scheduled lesson tomorrow, Sun 17:00: «عدّل الوقت» moves it. */
export const SCHEDULED = lesson({ id: 'l-1', starts_at: '2026-10-04T14:00:00.000Z', time_edit_mode: 'move' });
/** A completed 45-minute lesson this morning, 10:00: «عدّل الوقت» corrects it. */
export const HELD = lesson({ id: 'l-9', status: 'completed', starts_at: '2026-10-03T07:00:00.000Z', time_edit_mode: 'correct' });

export const SAVED: TimeEditResult = { lesson: SCHEDULED, notified: 0, payout: 'none', pdf_refresh: false };

/** Fake only `Date`, so promises and Testing Library's polling keep running. */
export function fakeNow(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => vi.useRealTimers());
}

/** The drawer on `l`, with «عدّل الوقت» pressed when the lesson offers it. */
export function openEditTime(l: LessonView) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LessonDrawer lesson={l} onClose={onClose} onDone={onDone} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.lessons.editTime }));
  return { onDone, onClose };
}

const label = (key: 'time' | 'duration' | 'reason') =>
  key === 'time' ? new RegExp(t.lessons.timeEdit.time.replace('{city}', '.+')) : t.lessons.timeEdit[key];

/** Fill the form the way a person does: selects and chips, no typing a time. */
export const pick = {
  day: (name: RegExp) => fireEvent.click(screen.getByRole('radio', { name })),
  time: (value: string) => fireEvent.change(screen.getByLabelText(label('time')), { target: { value } }),
  duration: (value: number) => fireEvent.change(screen.getByLabelText(label('duration')), { target: { value: String(value) } }),
  reason: (value: string) => fireEvent.change(screen.getByLabelText(label('reason')), { target: { value } }),
  save: () => fireEvent.click(screen.getByRole('button', { name: t.lessons.timeEdit.submit })),
};

/** The «قبل ← بعد» paragraph: each side sits in its own nowrap span, so match on the paragraph's text. */
export const confirmLine = (re: RegExp) =>
  screen.getByText((_, el) => el?.tagName === 'P' && re.test(el.textContent ?? ''));
