import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MY_FAMILY,
  OTHER_FAMILY,
  OTHER_STUDENT,
  ruleApp,
} from '@/modules/people/people-edit/testing/people-edit.rule.fakes';

type App = Awaited<ReturnType<typeof ruleApp>>;
const phoneUrl = (id: string) =>
  `/people/guardians/${id}/phones/${encodeURIComponent('+201000000009')}`;
const selfUrl = (id: string) => `/people/students/${id}/contact-self`;
const payload = { contact_is_self: true };

describe('/people/* writes on a foreign id while the sales ownership rule enforces', () => {
  let t: App;
  beforeAll(async () => {
    t = await ruleApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  const nothingWritten = () => {
    expect(t.phones.removeSecond).not.toHaveBeenCalled();
    expect(t.repo.student).not.toHaveBeenCalled();
    expect(t.repo.setSelf).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  };

  it("another family's second number is 403 not_your_family, nothing removed", async () => {
    const res = await t.call({ method: 'DELETE', url: phoneUrl(OTHER_FAMILY), token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([403, 'not_your_family']);
    nothingWritten();
  });

  it("another family's student as its own contact is 403 not_your_student", async () => {
    const req = { method: 'PATCH', url: selfUrl(OTHER_STUDENT), token: 'salesA', payload } as const;
    const res = await t.call(req);
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([403, 'not_your_student']);
    nothingWritten();
  });

  it('her own family, and the admin on any family, still remove a number', async () => {
    const callers = [
      ['salesA', MY_FAMILY],
      ['admin', OTHER_FAMILY],
    ] as const;
    for (const [token, id] of callers) {
      const res = await t.call({ method: 'DELETE', url: phoneUrl(id), token });
      expect(res.statusCode).toBe(204);
    }
    expect(t.phones.removeSecond).toHaveBeenCalledTimes(2);
  });

  it('the admin sets any student as its own contact', async () => {
    const req = { method: 'PATCH', url: selfUrl(OTHER_STUDENT), token: 'admin', payload } as const;
    const res = await t.call(req);
    expect(res.statusCode).toBe(200);
    expect(t.repo.setSelf).toHaveBeenCalledWith(OTHER_STUDENT, true);
  });
});
