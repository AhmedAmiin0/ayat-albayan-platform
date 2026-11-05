import type { ReportV2SubmitBody, SubmitBody } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { reportView } from '@/features/reporting/reports/report-fixture';
import { linkProblem, linkReportApi, linkReportFormQuery } from './link-api';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const TOKEN = 'v1.abc-DEF_123.sig';
const BASE = `http://api.test/public/teacher-report/${TOKEN}`;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(reportView()))));
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function calls(): [string, string, boolean][] {
  return fetchMock.mock.calls.map(([url, init]) => [
    url,
    init?.method ?? 'GET',
    new Headers(init?.headers).has('Authorization'),
  ]);
}

describe('the teacher link calls (no session)', () => {
  it('reads the form from GET /public/teacher-report/:token', async () => {
    const query = linkReportFormQuery(TOKEN);
    await query.queryFn?.({} as never);
    expect(calls()).toEqual([[BASE, 'GET', false]]);
  });

  it('saves and sends both forms through the token-bound routes', async () => {
    const api = linkReportApi(TOKEN);
    await api.saveDraft({ id: 'r-1', body: {} });
    await api.submitReport({ id: 'r-1', body: {} as SubmitBody });
    await api.saveDraftV2({ id: 'r-1', body: {} });
    await api.submitReportV2({ id: 'r-1', body: {} as ReportV2SubmitBody });
    expect(calls()).toEqual([
      [`${BASE}/reports/r-1/draft`, 'PUT', false],
      [`${BASE}/reports/r-1/submit`, 'POST', false],
      [`${BASE}/reports/r-1/v2/draft`, 'PUT', false],
      [`${BASE}/reports/r-1/v2/submit`, 'POST', false],
    ]);
    expect(api.attachments).toBe(false);
  });
});

describe('link problems', () => {
  it.each([
    [new ApiError(404, { code: 'link_not_found' }), 'invalid'],
    [new ApiError(410, { code: 'link_expired' }), 'expired'],
    [new ApiError(409, { code: 'link_not_open' }), 'not_open'],
    [new ApiError(429, { message: 'ThrottlerException' }), 'too_many'],
    [new ApiError(404, null), 'invalid'],
    [new ApiError(500, null), 'failed'],
    [new Error('offline'), 'failed'],
  ])('%o is %s', (error, problem) => {
    expect(linkProblem(error)).toBe(problem);
  });

  it('a refused send says the link expired, else the report error', () => {
    const { errorText } = linkReportApi(TOKEN);
    expect(errorText(new ApiError(410, { code: 'link_expired' }))).toBe(t.reports.teacherLink.expired);
    expect(errorText(new ApiError(429, null))).toBe(t.reports.teacherLink.tooMany);
    const conflict = new ApiError(409, { code: 'version_conflict' });
    expect(errorText(conflict)).toBe(t.reports.error.version_conflict);
  });
});
