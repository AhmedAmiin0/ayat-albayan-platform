import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PHONES } from './sign-in.fakes.accounts';
import { signInApp } from './sign-in.test-app';

const settle = () => new Promise((r) => setTimeout(r, 20));

describe('public sign-in routes (docs/30 §6)', () => {
  let h: Awaited<ReturnType<typeof signInApp>>;
  let ip = 0;
  const nextIp = () => `198.18.0.${(ip += 1)}`;
  beforeAll(async () => {
    h = await signInApp();
  });
  afterAll(() => h.app.close());

  it('GET /auth/code/status needs no login', async () => {
    const res = await h.get('/auth/code/status');
    expect([res.statusCode, res.json()]).toEqual([200, { available: true }]);
  });

  it('POST /auth/code/request: the same empty 202 for a family, a missing, a staff and a malformed number', async () => {
    const answers = [];
    for (const phone of [PHONES.guardian, PHONES.other, PHONES.teacher, '12']) {
      const res = await h.post('/auth/code/request', { phone }, nextIp());
      answers.push([res.statusCode, res.body]);
    }
    expect(answers).toEqual(Array(4).fill([202, '']));
    await settle();
    expect(h.send.sent.map((s) => s.phone)).toEqual([PHONES.guardian]);
  });

  it('POST /auth/password/forgot: the same empty 202 whatever the identifier names', async () => {
    const before = h.send.sent.length;
    const answers = [];
    for (const identifier of ['omar', 'ghost', 'AB-1234', 'AB-9999', PHONES.guardian, 'nobody@example.com']) {
      const res = await h.post('/auth/password/forgot', { identifier }, nextIp());
      answers.push([res.statusCode, res.body]);
    }
    expect(answers).toEqual(Array(6).fill([202, '']));
    await settle();
    expect(h.send.sent.slice(before).map((s) => s.phone)).toEqual([PHONES.teacher, PHONES.guardian]);
  });

  it('POST /auth/code/verify returns only the token hash and its type', async () => {
    await h.post('/auth/code/request', { phone: PHONES.guardian }, nextIp());
    await settle();
    const res = await h.post('/auth/code/verify', { phone: PHONES.guardian, code: h.send.lastTo(PHONES.guardian) }, nextIp());
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['token_hash', 'type']);
  });

  it('POST /auth/login: a session, or 401 invalid_credentials', async () => {
    const ok = await h.post('/auth/login', { username: 'omar', password: 'Teacher-pass-1' }, nextIp());
    expect([ok.statusCode, ok.json().access_token]).toEqual([200, 'at-p-teacher']);
    const bad = await h.post('/auth/login', { username: 'omar', password: 'nope' }, nextIp());
    expect([bad.statusCode, bad.json().code]).toEqual([401, 'invalid_credentials']);
  });

  it('validates every body (400) and answers 204 on a reset', async () => {
    expect((await h.post('/auth/code/verify', { phone: PHONES.guardian, code: '12' }, nextIp())).statusCode).toBe(400);
    expect((await h.post('/auth/login', { username: '' }, nextIp())).statusCode).toBe(400);
    await h.post('/auth/password/forgot', { identifier: 'admin@example.com' }, nextIp());
    await settle();
    const res = await h.post('/auth/password/reset', { identifier: 'admin@example.com', code: h.send.lastTo(PHONES.admin), password: 'Admin-new-123' }, nextIp());
    expect(res.statusCode).toBe(204);
  });
});
