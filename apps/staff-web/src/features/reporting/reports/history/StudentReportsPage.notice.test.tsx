import type { StudentReportsResponse } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TrialChatNote } from '@/features/teaching/teacher/lessons/TrialChatNote';
import { StudentReportsPage } from './StudentReportsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const EMPTY: StudentReportsResponse = { items: [], total: 0, page: 1, pageSize: 10, series: [] };

function renderPage(notice: ReactNode) {
  apiFetch.mockResolvedValue(EMPTY);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentReportsPage studentId="s-1" name="سهيلة" role="teacher" tz="Asia/Riyadh" notice={notice} />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('teacher student file: a trial family is reached through sales (owner, 2026-10-11)', () => {
  it('a trial student: the note under the heading, while loading and once loaded', async () => {
    renderPage(<TrialChatNote status="trial" />);
    expect(screen.getByRole('note').textContent).toBe(t.teacherDash.trialChatViaSales);
    expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
    expect(screen.getByRole('note')).toBeTruthy();
  });

  it('an active student: no note', async () => {
    renderPage(<TrialChatNote status="active" />);
    expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });
});
