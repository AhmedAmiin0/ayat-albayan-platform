import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PHONES } from './sign-in.fakes.accounts';
import { signInApp } from './sign-in.test-app';

const settle = () => new Promise((r) => setTimeout(r, 20));

describe('teacher code routes (docs/46 A2)', () => {
  let h: Awaited<ReturnType<typeof signInApp>>;
  let ip = 0;
  const nextIp = () => `198.18.1.${(ip += 1)}`;
  beforeAll(async () => {
    h = await signInApp();
  });
  afterAll(() => h.app.close());

  it('POST /auth/staff-code/request: the same empty 202 for a teacher, a guardian, an admin, a missing and a bad number', async () => {
    const answers = [];
    for (const phone of [PHONES.newTeacher, PHONES.guardian, PHONES.admin, PHONES.other, '12']) {
      const res = await h.post('/auth/staff-code/request', { phone }, nextIp());
      answers.push([res.statusCode, res.body]);
    }
    expect(answers).toEqual(Array(5).fill([202, '']));
    await settle();
    expect(h.send.sent.map((s) => s.phone)).toEqual([PHONES.newTeacher]);
  });

  it('POST /auth/staff-code/verify: only the token hash; a wrong code is the generic 401; bodies are validated', async () => {
    const bad = await h.post(
      '/auth/staff-code/verify',
      { phone: PHONES.other, code: '123456' },
      nextIp(),
    );
    expect([bad.statusCode, bad.json().code]).toEqual([401, 'invalid_code']);
    expect(
      (await h.post('/auth/staff-code/verify', { phone: PHONES.newTeacher, code: '12' }, nextIp()))
        .statusCode,
    ).toBe(400);
    const code = h.send.lastTo(PHONES.newTeacher);
    const res = await h.post(
      '/auth/staff-code/verify',
      { phone: PHONES.newTeacher, code },
      nextIp(),
    );
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['token_hash', 'type']);
  });
});
