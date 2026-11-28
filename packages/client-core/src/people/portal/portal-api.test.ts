import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http';
import { PORTAL_KEY, PORTAL_REFRESH_MS, portalQueries } from './portal-api';
import { portalSends } from './portal-sends';

const answers: Record<string, unknown> = {
  '/portal/me': { kind: 'guardian', students: [], renew_url: null },
  '/portal/students/s1/lessons': { lessons: [] },
  '/portal/students/s1/reports': { reports: [] },
  '/portal/students/s1/package': { package: null },
  '/portal/students/s1/history?status=absent': { rows: [], next_cursor: 'c1' },
  '/portal/students/s1/history?status=absent&cursor=c1': { rows: [], next_cursor: null },
};
const apiFetch = vi.fn(async (path: string) => answers[path]);
const apiSend = vi.fn(async (): Promise<unknown> => ({ url: 'https://x.example.org', expires_at: 'z' }));
const client = { apiFetch, apiSend } as unknown as ApiClient;
const q = portalQueries(client);

describe('portal reads', () => {
  it('keys are the path segments under ["portal"]; the lessons poll every 30 s', async () => {
    expect(q.portalHomeQuery.queryKey).toEqual(['portal', 'me']);
    expect(q.portalHomeQuery.queryKey.slice(0, 1)).toEqual(PORTAL_KEY);
    expect(q.portalLessonsQuery('s1').refetchInterval).toBe(PORTAL_REFRESH_MS);
    expect(q.portalLessonsQuery('s1').refetchOnWindowFocus).toBe(true);
    await expect(q.portalHomeQuery.queryFn()).resolves.toMatchObject({ kind: 'guardian' });
    await expect(q.portalReportsQuery('s1').queryFn()).resolves.toEqual({ reports: [] });
  });

  it('the package view fills the defaults of an older API', async () => {
    await expect(q.portalPackageQuery('s1').queryFn()).resolves.toEqual({
      package: null, payments: [], payment_instructions: '',
    });
  });

  it('an answer outside the schema is refused (rule 12)', async () => {
    apiFetch.mockResolvedValueOnce({ lessons: 'nope' });
    await expect(q.portalLessonsQuery('s1').queryFn()).rejects.toThrow();
  });

  it('history pages walk the cursor until null', async () => {
    const pages = q.portalHistoryQuery({ studentId: 's1', status: 'absent' });
    expect(pages.queryKey).toEqual(['portal', 'students', 's1', 'history', 'list', { status: 'absent' }]);
    const first = await pages.queryFn({ pageParam: pages.initialPageParam });
    expect(pages.getNextPageParam(first)).toBe('c1');
    const last = await pages.queryFn({ pageParam: 'c1' });
    expect(pages.getNextPageParam(last)).toBeUndefined();
  });

  it('the report page by the report id, not retried', async () => {
    const view = q.reportPageByIdQuery('r1');
    expect([view.queryKey, view.retry]).toEqual([['report-pages', 'by-report', 'r1'], false]);
    apiFetch.mockResolvedValueOnce({});
    await expect(view.queryFn()).rejects.toThrow();
    expect(apiFetch).toHaveBeenLastCalledWith('/report-pages/by-report/r1');
  });
});

const LESSON = '/portal/students/s1/lessons/l1';

describe('portal sends', () => {
  const sends = portalSends(client);
  it('mints a signed file link per tap', async () => {
    await sends.fileUrl({ studentId: 's1', kind: 'recordings', id: 'rec1' });
    const sent = '/portal/students/s1/recordings/rec1/url';
    expect(apiSend).toHaveBeenLastCalledWith('POST', sent, undefined);
    await sends.fileUrl({ studentId: 's1', kind: 'reports', id: 'r1' });
    const report = '/portal/students/s1/reports/r1/url';
    expect(apiSend).toHaveBeenLastCalledWith('POST', report, undefined);
  });

  it('asks our classroom to admit the student, and checks the room answer', async () => {
    const room = { url: 'wss://lk.example.org', token: 't', room: 'lesson-l1', role: 'guest' };
    apiSend.mockResolvedValueOnce(room);
    await expect(sends.join({ studentId: 's1', lessonId: 'l1' })).resolves.toEqual(room);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `${LESSON}/join`, undefined);
    apiSend.mockResolvedValueOnce({ url: 1 });
    await expect(sends.join({ studentId: 's1', lessonId: 'l1' })).rejects.toThrow();
  });

  it('asks for the signed room link the phone browser opens, and checks its shape', async () => {
    const link = { url: 'https://app.example.org/join/x', expires_at: '2026-10-27T16:45:00.000Z' };
    apiSend.mockResolvedValueOnce(link);
    await expect(sends.roomLink({ studentId: 's1', lessonId: 'l1' })).resolves.toEqual(link);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `${LESSON}/room-link`, undefined);
    apiSend.mockResolvedValueOnce({ url: 'x' });
    await expect(sends.roomLink({ studentId: 's1', lessonId: 'l1' })).rejects.toThrow();
  });
});
