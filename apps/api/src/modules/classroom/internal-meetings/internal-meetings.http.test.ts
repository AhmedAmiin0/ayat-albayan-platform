import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID, MEETING_TOKEN, meetingRow } from './internal-meetings.fakes';
import { classroomApp } from '../test-app';

const base = `/meetings/${MEETING_ID}`;
const pub = `/public/meetings/${MEETING_TOKEN}`;

describe('internal meeting routes', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('POST /meetings: 201 {id, url} for every staff role, 403 a guardian, 401 without login', async () => {
    for (const token of ['admin', 'teacher', 'assistant', 'sales'] as const) {
      const res = await h.call({ method: 'POST', url: '/meetings', token, body: { title: 'تنسيق' } });
      expect(res.statusCode).toBe(201);
      expect(res.json().url).toMatch(/^https:\/\/app\.example\.test\/m\/[A-Za-z0-9_-]{43}$/);
    }
    expect((await h.call({ method: 'POST', url: '/meetings', token: 'guardian', body: {} })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: '/meetings', token: null, body: {} })).statusCode).toBe(401);
  });

  it('GET /meetings lists; POST end: 204 the creator, 403 another teacher', async () => {
    const list = await h.call({ method: 'GET', url: '/meetings', token: 'teacher' });
    expect(list.json()).toMatchObject([{ id: MEETING_ID, state: 'open', can_manage: true }]);
    expect((await h.call({ method: 'POST', url: `${base}/end`, token: 'teacher' })).statusCode).toBe(204);
    expect((await h.call({ method: 'POST', url: `${base}/end`, token: 'other' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: `${base}/link`, token: 'admin' })).statusCode).toBe(200);
  });

  it('POST /meetings/:id/join: 200 a token in meeting-<id>; 410 once ended; 400 for a bad id', async () => {
    const res = await h.call({ method: 'POST', url: `${base}/join`, token: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'sales', room: `meeting-${MEETING_ID}` });
    h.meetings.byId.mockResolvedValueOnce(meetingRow({ ends_at: '2020-01-01T00:00:00Z' }));
    const ended = await h.call({ method: 'POST', url: `${base}/join` });
    expect([ended.statusCode, ended.json().code]).toEqual([410, 'meeting_ended']);
    expect((await h.call({ method: 'POST', url: '/meetings/nope/join' })).statusCode).toBe(400);
  });

  it('POST remove: 404 for an identity of another shape, 204 a guest by the creator', async () => {
    expect((await h.call({ method: 'POST', url: `${base}/participants/x/remove`, token: 'teacher' })).statusCode).toBe(404);
    const ok = await h.call({ method: 'POST', url: `${base}/participants/guest-0123456789ab/remove`, token: 'teacher' });
    expect(ok.statusCode).toBe(204);
  });

  it('public: GET the title with no login, POST join as a guest, 410 once ended', async () => {
    const view = await h.call({ method: 'GET', url: pub, token: null, ip: '3.3.3.1' });
    expect([view.statusCode, view.json()]).toEqual([200, { title: 'اجتماع الإدارة', state: 'open', starts_at: null, opens_at: null }]);
    const join = await h.call({ method: 'POST', url: `${pub}/join`, token: null, body: { name: 'ضيف' }, ip: '3.3.3.2' });
    expect(join.json()).toMatchObject({ role: 'guest', room: `meeting-${MEETING_ID}` });
    h.meetings.byHash.mockResolvedValueOnce(meetingRow({ revoked: true }));
    const gone = await h.call({ method: 'POST', url: `${pub}/join`, token: null, body: { name: 'ضيف' }, ip: '3.3.3.3' });
    expect(gone.statusCode).toBe(410);
    expect((await h.call({ method: 'GET', url: '/public/meetings/bad', token: null, ip: '3.3.3.4' })).statusCode).toBe(404);
  });
});

describe('internal meeting routes without LiveKit', () => {
  it('creation and the public page still work; joining answers 503 classroom_not_configured', async () => {
    const h = await classroomApp(null);
    h.reset();
    expect((await h.call({ method: 'POST', url: '/meetings', body: {} })).statusCode).toBe(201);
    expect((await h.call({ method: 'GET', url: pub, token: null, ip: '4.4.4.1' })).statusCode).toBe(200);
    const join = await h.call({ method: 'POST', url: `${pub}/join`, token: null, body: { name: 'ضيف' }, ip: '4.4.4.2' });
    expect([join.statusCode, join.json().code]).toEqual([503, 'classroom_not_configured']);
    await h.app.close();
  });
});
