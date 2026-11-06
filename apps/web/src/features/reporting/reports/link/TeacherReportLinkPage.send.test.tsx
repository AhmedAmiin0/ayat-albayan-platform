import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { formResponse, reportView } from '@/features/reporting/reports/report-fixture';
import { gradeEverything } from '@/features/reporting/reports/report-form-kit';
import { TeacherReportLinkPage } from './TeacherReportLinkPage';

// The no-login page sends through the link's token, with the same one-send / read-only / edit
// rules as the signed-in form (owner 2026-11-06).
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
const AT = '2026-10-03T14:05:00.000Z';
const SENT = reportView({ status: 'submitted', version: 1, attendance: 'on_time', submitted_at: AT });
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('TeacherReportLinkPage: sending', () => {
  it('a double tap sends once; then «تم إرسال التقرير بنجاح», read-only, «تعديل التقرير»', async () => {
    let answer: (value: Response) => void = () => undefined;
    fetchMock.mockImplementation((_url, init) =>
      init?.method === 'POST'
        ? new Promise<Response>((resolve) => (answer = resolve))
        : json(init?.method === 'PUT' ? reportView() : formResponse()));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherReportLinkPage token="tok" />
      </QueryClientProvider>,
    );
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    const button = screen.getByRole('button', { name: t.reports.submit });
    // Two clicks before React re-renders (a double tap): the hook's guard stops the second.
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]?.[0]).toBe('http://api.test/public/teacher-report/tok/reports/r-1/submit');
    answer(new Response(JSON.stringify(SENT), { status: 200 }));
    expect(await screen.findByText(/تم إرسال التقرير بنجاح/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.reports.submit })).toBeNull();
    expect(screen.getByRole('button', { name: t.reports.edit })).toBeTruthy();
    expect(posts()).toHaveLength(1);
  });
});
