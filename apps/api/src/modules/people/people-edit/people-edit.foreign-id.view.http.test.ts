import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MY_STUDENT,
  OTHER_STUDENT,
  ruleApp,
} from '@/modules/people/people-edit/testing/people-edit.rule.fakes';

type App = Awaited<ReturnType<typeof ruleApp>>;
const url = (id: string) => `/people/students/${id}`;

describe('GET /people/students/:id while the sales ownership rule enforces', () => {
  let t: App;
  beforeAll(async () => {
    t = await ruleApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it("another family's student is 403 not_your_student, nothing read", async () => {
    const res = await t.call({ method: 'GET', url: url(OTHER_STUDENT), token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([403, 'not_your_student']);
    expect(t.repo.view).not.toHaveBeenCalled();
    expect(t.records.records).not.toHaveBeenCalled();
  });

  it('her own student opens', async () => {
    const res = await t.call({ method: 'GET', url: url(MY_STUDENT), token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.repo.view).toHaveBeenCalledWith(MY_STUDENT);
  });

  it('the admin opens any student', async () => {
    const res = await t.call({ method: 'GET', url: url(OTHER_STUDENT), token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ student: { id: string } }>().student.id).toBe(OTHER_STUDENT);
  });
});
