import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { portalApp, S1, S2, S3, type Who } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const ROUTES: ['GET' | 'POST', string][] = [
  ['GET', `/portal/students/${S1}/lessons`],
  ['GET', `/portal/students/${S1}/reports`],
  ['GET', `/portal/students/${S1}/package`],
  ['POST', `/portal/students/${S1}/reports/f1000000-0000-4000-8000-000000000001/url`],
];

// docs/31: a guardian sees only their own students, a student only themself; staff never use /portal.
describe('/portal scope over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('answers the guardian and student logins; staff get 403, no token 401', async () => {
    expect((await t.call('GET', '/portal/me', 'guardianA')).statusCode).toBe(200);
    expect((await t.call('GET', '/portal/me', 'student1')).statusCode).toBe(200);
    for (const who of ['admin', 'teacher', 'sales', 'assistant'] as Who[]) {
      expect([who, (await t.call('GET', '/portal/me', who)).statusCode]).toEqual([who, 403]);
      for (const [method, url] of ROUTES) expect([who, url, (await t.call(method, url, who)).statusCode]).toEqual([who, url, 403]);
    }
    expect((await t.call('GET', '/portal/me')).statusCode).toBe(401);
  });

  it('GET /portal/me: the guardian gets both children and the chat link; the scope is read by the caller id', async () => {
    const res = await t.call('GET', '/portal/me', 'guardianA');
    expect(res.json()).toEqual({
      kind: 'guardian',
      students: [expect.objectContaining({ id: S1, name: 'سلمى' }), expect.objectContaining({ id: S2, name: 'يوسف' })],
      renew_url: 'https://wa.me/966500000000',
    });
    expect(t.scope.studentsOf).toHaveBeenCalledWith('g-a');
  });

  it('a student login sees only itself', async () => {
    const res = await t.call('GET', '/portal/me', 'student1');
    expect(res.json().kind).toBe('student');
    expect(res.json().students.map((s: { id: string }) => s.id)).toEqual([S1]);
  });

  it('another family is 404 student_not_found on every route, and nothing is read for it', async () => {
    for (const [method, url] of ROUTES) {
      const res = await t.call(method, url, 'guardianB');
      expect([url, res.statusCode, res.json().code]).toEqual([url, 404, 'student_not_found']);
    }
    expect(t.lessons.ahead).not.toHaveBeenCalled();
    expect(t.reports.sent).not.toHaveBeenCalled();
    expect(t.packages.packages).not.toHaveBeenCalled();
    expect(t.storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a student never reaches a sibling (same guardian)', async () => {
    for (const path of ['lessons', 'reports', 'package']) {
      expect((await t.call('GET', `/portal/students/${S2}/${path}`, 'student1')).statusCode).toBe(404);
    }
    expect((await t.call('GET', `/portal/students/${S2}/lessons`, 'guardianA')).statusCode).toBe(200);
    expect((await t.call('GET', `/portal/students/${S3}/lessons`, 'guardianA')).statusCode).toBe(404);
  });

  it('a bad id is 400; without a known chat number the renewal link is null', async () => {
    expect((await t.call('GET', '/portal/students/nope/lessons', 'guardianA')).statusCode).toBe(400);
    t.chat.e164.mockResolvedValueOnce(null);
    expect((await t.call('GET', '/portal/me', 'guardianA')).json().renew_url).toBeNull();
    t.chat.e164.mockRejectedValueOnce(new Error('db down'));
    expect((await t.call('GET', '/portal/me', 'guardianA')).json().renew_url).toBeNull();
  });
});
