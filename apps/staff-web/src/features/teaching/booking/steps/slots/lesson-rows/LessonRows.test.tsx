import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDraft, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { ABRAR } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { LessonRows } from './LessonRows';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

// Sunday 4 October, Riyadh: 17:00 free, 17:45 busy (another lesson), 18:30 free; 45-min grid.
const slot = (at: string, busy = false) => ({
  starts_at: at,
  ends_at: at,
  conflicts: busy ? [{ kind: 'teacher_busy', startsAt: at, endsAt: at, lessonId: 'l1' }] : [],
});
const SLOTS = {
  teacher_tz: 'Asia/Riyadh',
  step_min: 45,
  slots: [slot('2026-10-04T14:00:00.000Z'), slot('2026-10-04T14:45:00.000Z', true), slot('2026-10-04T15:30:00.000Z')],
};

function setup(draft: Partial<BookingDraft> = {}) {
  const onChange = vi.fn();
  apiFetch.mockResolvedValue(SLOTS);
  const full = { ...emptyDraft(), tz: 'Asia/Riyadh', teacher: { ...ABRAR, tz: 'Asia/Riyadh' }, ...draft };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LessonRows draft={full} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

const row = (n: number) => screen.getByRole('group', { name: t.lessonTimes.row.replace('{n}', String(n)) });
function fill(n: number, date: string, time: string) {
  fireEvent.change(within(row(n)).getByLabelText(t.lessonTimes.date), { target: { value: date } });
  fireEvent.change(within(row(n)).getByLabelText(t.lessonTimes.time), { target: { value: time } });
}

describe('LessonRows: a date and a time per lesson day (owner 2026-11-07)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('native date and time inputs; the date bounded from today; a free time is said free', async () => {
    const onChange = setup();
    const date = within(row(1)).getByLabelText(t.lessonTimes.date);
    expect(date.getAttribute('type')).toBe('date');
    expect(date.getAttribute('min')).toBe('2026-10-03');
    expect(within(row(1)).getByLabelText(t.lessonTimes.time).getAttribute('type')).toBe('time');
    fill(1, '2026-10-04', '17:00');
    expect(onChange).toHaveBeenLastCalledWith({ startsAt: '2026-10-04T14:00:00.000Z', extra: [] });
    expect(await screen.findByText(t.lessonTimes.free)).toBeTruthy();
  });

  it('a busy time: the conflict notice and the nearest free times, one click takes it', async () => {
    const onChange = setup();
    fill(1, '2026-10-04', '17:45');
    expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
    const nearest = screen.getByRole('group', { name: t.lessonTimes.nearest });
    fireEvent.click(within(nearest).getByRole('button', { name: t.lessonTimes.useTime.replace('{time}', '18:30') }));
    expect(onChange).toHaveBeenLastCalledWith({ startsAt: '2026-10-04T15:30:00.000Z', extra: [] });
  });

  it('outside the availability: the availability line', async () => {
    setup();
    fill(1, '2026-10-04', '22:00');
    expect(await screen.findByText(/خارج المواعيد المتاحة|outside/)).toBeTruthy();
  });

  it('a time already past today', async () => {
    setup();
    fill(1, '2026-10-03', '08:00');
    expect(await screen.findByText(t.lessonTimes.past)).toBeTruthy();
  });

  it('the admin adds a day; the same weekday twice is an error and nothing is picked', async () => {
    const onChange = setup();
    fill(1, '2026-10-04', '17:00');
    fireEvent.click(screen.getByRole('button', { name: t.lessonTimes.addDay }));
    fill(2, '2026-10-04', '18:30');
    expect(await screen.findByText(t.lessonTimes.sameDay)).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith({ startsAt: null, extra: [] });
    fill(2, '2026-10-07', '19:30');
    expect(onChange).toHaveBeenLastCalledWith({ startsAt: '2026-10-04T14:00:00.000Z', extra: ['2026-10-07T16:30:00.000Z'] });
  });

  it('a course: exactly its days a week, from its first day, no add or remove', () => {
    const course = { perWeek: 2, lessonsTotal: 8, package: '8' as const, startsOn: '2026-10-10' };
    setup({ course });
    expect(screen.getAllByRole('group', { name: new RegExp(t.lessonTimes.row.replace(' {n}', '')) })).toHaveLength(2);
    const date = within(row(2)).getByLabelText(t.lessonTimes.date);
    expect(date.getAttribute('min')).toBe('2026-10-10');
    expect(screen.queryByRole('button', { name: t.lessonTimes.addDay })).toBeNull();
  });
});
