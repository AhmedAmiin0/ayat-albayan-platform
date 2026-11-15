import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LessonDisclosure } from './LessonDisclosure';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/reporting/report-page', async (orig) => ({
  ...(await orig<object>()),
  LessonReportView: ({ reportId }: { reportId: string }) => <p>report {reportId}</p>,
}));
vi.mock('@/features/people/students', async (orig) => ({
  ...(await orig<object>()),
  LessonRecording: ({ lessonId }: { lessonId: string }) => <p>recording {lessonId}</p>,
}));

const NO_RETRY = { defaultOptions: { queries: { retry: false } } };
const ROW = { lesson_id: 'l-9', starts_at: '2026-10-03T13:00:00.000Z', report_id: 'r-9' };

function show(row: typeof ROW | { lesson_id: string; starts_at: string; report_id: null }) {
  const client = new QueryClient(NO_RETRY);
  const view = render(
    <QueryClientProvider client={client}>
      <LessonDisclosure row={row} studentId="s-1" />
    </QueryClientProvider>,
  );
  const settled = () => client.isFetching() === 0 && apiFetch.mock.calls.length > 0;
  return { ...view, settled };
}

const byReportCalls = () =>
  apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('by-report'));

afterEach(() => {
  apiFetch.mockReset();
  window.location.hash = '';
});

describe('LessonDisclosure: the report and recording inside the lesson row (docs/49)', () => {
  it('closed: nothing mounts and no report is read until the summary is opened', async () => {
    apiFetch.mockResolvedValue([]);
    show(ROW);
    const summary = await screen.findByText(t.reports.view);
    expect(summary.tagName).toBe('SUMMARY');
    expect(screen.queryByText('report r-9')).toBeNull();
    expect(byReportCalls()).toEqual([]);
    fireEvent.click(summary);
    expect(await screen.findByText('report r-9')).toBeTruthy();
    expect(screen.queryByText('recording l-9')).toBeNull();
  });

  it('a recording only: «تسجيل الحلقة», and it opens the recording', async () => {
    apiFetch.mockResolvedValue(['l-9']);
    show({ ...ROW, report_id: null });
    fireEvent.click(await screen.findByText(t.studentRecordings.reportLink));
    expect(await screen.findByText('recording l-9')).toBeTruthy();
    expect(screen.queryByText(/^report /)).toBeNull();
  });

  it('an old #recording-<id> link lands on its row open', async () => {
    window.location.hash = '#recording-l-9';
    apiFetch.mockResolvedValue(['l-9']);
    show(ROW);
    expect(await screen.findByText('report r-9')).toBeTruthy();
    expect(await screen.findByText('recording l-9')).toBeTruthy();
  });

  it('no report and no recording: nothing at all', async () => {
    apiFetch.mockResolvedValue([]);
    const { container, settled } = show({ ...ROW, report_id: null });
    await vi.waitFor(() => expect(settled()).toBe(true));
    expect(container.textContent).toBe('');
  });
});
