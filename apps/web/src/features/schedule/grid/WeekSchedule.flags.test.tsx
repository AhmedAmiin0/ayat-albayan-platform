import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lesson } from '../lesson/lesson-fixture';
import { overview } from '../overview-fixture';
import { WeekSchedule } from './WeekSchedule';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const CLASH = { kind: 'teacher_busy' as const, startsAt: '2026-10-04T14:00:00.000Z', endsAt: '2026-10-04T14:45:00.000Z' };
const FLAGGED = lesson({ id: 'a', conflicts: [CLASH] });
// Next week's lesson with a teacher's proposal: not in the week on screen.
const PROPOSED = lesson({
  id: 'p',
  starts_at: '2026-10-11T14:00:00.000Z',
  pending_proposal: { id: 'pp', proposed_starts_at: '2026-10-12T15:00:00.000Z', note: null, created_at: '2026-10-02T09:00:00.000Z' },
});

function renderWeek(week: LessonView[]) {
  apiFetch.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/lessons/overview') ? overview(week) : path.startsWith('/lesson-proposals') ? [PROPOSED] : []),
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WeekSchedule search={{}} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('WeekSchedule — proposals and flags (R-SCH-08, R-SCH-04)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('lists pending proposals from any week; opening one shows approve / reject', async () => {
    renderWeek([FLAGGED]);
    const panel = await screen.findByRole('region', { name: new RegExp(t.lessons.proposal.title) });
    fireEvent.click(within(panel).getByRole('button', { name: /سهيلة · أبرار/ }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('button', { name: t.lessons.proposal.approve })).toBeTruthy();
  });

  it('a generated lesson with a clash is flagged on its chip', async () => {
    renderWeek([FLAGGED]);
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    const chip = within(grid).getByRole('button', { name: /سهيلة/ });
    expect(within(chip).getByText(t.schedule.needsReview)).toBeTruthy();
  });

  it('a week with no lessons still lists the teachers, never «0 حلقة»', async () => {
    renderWeek([]);
    const grid = await screen.findByRole('table', { name: t.schedule.grid });
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(3);
    expect(within(grid).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText(/^0 /)).toBeNull();
  });

  it('an academy with no teachers yet says so', async () => {
    apiFetch.mockImplementation((path: string) => Promise.resolve(path.startsWith('/lessons/overview') ? overview([], []) : []));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <WeekSchedule search={{}} onSearch={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: t.teachers.empty })).toBeTruthy();
  });
});
