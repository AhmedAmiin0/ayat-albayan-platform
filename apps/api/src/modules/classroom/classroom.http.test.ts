import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { decode, LESSON_ID, LINK_TOKEN, OPEN, STUDENT_ID } from './classroom.fakes';
import { classroomApp } from './test-app';

const join = `/lessons/${LESSON_ID}/room/join`;
const link = `/lessons/${LESSON_ID}/join-link`;

describe('classroom routes: who gets in', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  it.each(['admin', 'teacher', 'assistant'] as const)('POST room/join as %s answers {url, token, room, role}', async (token) => {
    const res = await h.call({ method: 'POST', url: join, token });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['recording', 'role', 'room', 'token', 'url']);
    expect(res.json().role).toBe(token);
    expect(decode(res.json().token).validSignature).toBe(true);
  });

  it('401 without a login, 403 for a guardian, 403 for another teacher, 403 for an unrelated assistant', async () => {
    expect((await h.call({ method: 'POST', url: join, token: null })).statusCode).toBe(401);
    expect((await h.call({ method: 'POST', url: join, token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: join, token: 'other' })).statusCode).toBe(403);
    h.queries.assistsLesson.mockResolvedValue(false);
    expect((await h.call({ method: 'POST', url: join, token: 'assistant' })).statusCode).toBe(403);
  });

  it('400 for a path that is not a uuid', async () => {
    expect((await h.call({ method: 'POST', url: '/lessons/nope/room/join' })).statusCode).toBe(400);
  });

  it('503 classroom_not_configured without LIVEKIT_* (own app)', async () => {
    const off = await classroomApp(null);
    off.reset();
    const res = await off.call({ method: 'POST', url: join });
    expect([res.statusCode, res.json().code]).toEqual([503, 'classroom_not_configured']);
    await off.app.close();
  });
});

describe('POST /lessons/:id/join-link and the assistant routes are admin only', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('the admin sends the link (200); a teacher, an assistant and a guardian cannot', async () => {
    expect((await h.call({ method: 'POST', url: link, body: { studentId: STUDENT_ID } })).statusCode).toBe(200);
    for (const token of ['teacher', 'assistant', 'guardian'] as const) {
      expect((await h.call({ method: 'POST', url: link, token, body: { studentId: STUDENT_ID } })).statusCode).toBe(403);
    }
    expect(h.outbox.send).toHaveBeenCalledTimes(1);
  });

  it('manages assistants as admin only', async () => {
    const url = `/students/${STUDENT_ID}/assistants`;
    expect((await h.call({ method: 'GET', url })).statusCode).toBe(200);
    expect((await h.call({ method: 'POST', url, body: { profileId: LESSON_ID } })).statusCode).toBe(200);
    expect((await h.call({ method: 'DELETE', url: `${url}/${LESSON_ID}` })).statusCode).toBe(200);
    for (const token of ['teacher', 'assistant'] as const) {
      expect((await h.call({ method: 'GET', url, token })).statusCode).toBe(403);
      expect((await h.call({ method: 'POST', url, token, body: { profileId: LESSON_ID } })).statusCode).toBe(403);
      expect((await h.call({ method: 'GET', url: '/assistants', token })).statusCode).toBe(403);
    }
  });

  it('GET /assistants/me/lessons is for assistants only, and needs a range', async () => {
    const range = '?from=2026-10-05T00:00:00.000Z&to=2026-10-06T00:00:00.000Z';
    expect((await h.call({ method: 'GET', url: `/assistants/me/lessons${range}`, token: 'assistant' })).statusCode).toBe(200);
    expect((await h.call({ method: 'GET', url: '/assistants/me/lessons', token: 'assistant' })).statusCode).toBe(400);
    for (const token of ['admin', 'teacher', 'guardian'] as const) {
      expect((await h.call({ method: 'GET', url: `/assistants/me/lessons${range}`, token })).statusCode).toBe(403);
    }
  });
});

describe('POST /public/join/:linkToken (no login)', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  const guest = (over: { token?: string; body?: object; ip?: string } = {}) =>
    h.call({ method: 'POST', url: `/public/join/${over.token ?? LINK_TOKEN}`, token: null, body: over.body ?? { name: 'سهيلة' }, ...(over.ip ? { ip: over.ip } : {}) });

  it('answers a guest token without any Authorization header', async () => {
    const res = await guest({ ip: '10.0.0.1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'guest', room: `lesson-${LESSON_ID}` });
  });

  it('is rate limited: the 11th call on one link from one IP is 429, another IP is not', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await guest({ ip: '10.0.0.2' })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
    expect((await guest({ ip: '10.0.0.3' })).statusCode).toBe(200);
  });

  it('404 link_invalid for an unknown link, 400 for a missing name', async () => {
    h.queries.linkByHash.mockResolvedValue(null);
    const res = await guest({ ip: '10.0.0.4' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'link_invalid']);
    expect((await guest({ ip: '10.0.0.5', body: {} })).statusCode).toBe(400);
  });
});
