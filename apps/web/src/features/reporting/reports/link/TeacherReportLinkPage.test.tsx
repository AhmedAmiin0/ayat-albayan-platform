import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { formResponse } from '@/features/reporting/reports/report-fixture';
import { TeacherReportLinkPage } from './TeacherReportLinkPage';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const tl = () => t.reports.teacherLink;

function open(token = 'tok') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherReportLinkPage token={token} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('TeacherReportLinkPage (signed link, no login)', () => {
  it('opens the lesson report form from the link with attachments, without history', async () => {
    fetchMock.mockImplementation(() => json(200, formResponse()));
    open();
    const identity = await screen.findByRole('region', { name: t.reports.identity });
    expect(identity.textContent).toContain('سهيلة');
    expect(screen.getByText(tl().subtitle)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reports.submit })).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.reports.history })).toBeNull();
    expect(screen.getByRole('region', { name: t.reports.attachments })).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/public/teacher-report/tok');
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  });

  it.each([
    [410, 'link_expired', () => tl().expired],
    [404, 'link_not_found', () => tl().invalid],
    [409, 'link_not_open', () => tl().notOpen],
  ])('a %i %s says so, with no form and no retry', async (status, code, text) => {
    fetchMock.mockImplementation(() => json(status, { code }));
    open();
    expect(await screen.findByText(text())).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.reports.identity })).toBeNull();
    expect(screen.queryByRole('button', { name: tl().retry })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('too many tries asks to wait and retries on demand', async () => {
    fetchMock.mockImplementationOnce(() => json(429, { message: 'too_many' }));
    fetchMock.mockImplementation(() => json(200, formResponse()));
    open();
    expect(await screen.findByText(tl().tooMany)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: tl().retry }));
    expect(await screen.findByRole('region', { name: t.reports.identity })).toBeTruthy();
  });
});
