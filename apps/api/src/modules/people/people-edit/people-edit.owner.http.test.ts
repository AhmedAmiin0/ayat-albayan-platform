import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { forbidden } from '@/common/http/errors';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';

// PR #612 SalesOwnershipRule: while it is enforced, a write on someone else's student or family is
// refused before any service runs.
describe('/people/* writes and the ownership rule', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await peopleApp();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.owners.student.mockRejectedValue(forbidden('not_your_student'));
    mocks.owners.family.mockRejectedValue(forbidden('not_your_family'));
  });

  it.each([
    {
      method: 'PATCH',
      url: `/people/students/${S}`,
      payload: { name: 'سهيلة' },
      code: 'not_your_student',
    },
    {
      method: 'PATCH',
      url: `/people/guardians/${G}`,
      payload: { notes: 'x' },
      code: 'not_your_family',
    },
    {
      method: 'POST',
      url: `/people/students/${S}/guardian`,
      payload: { guardian_id: G },
      code: 'not_your_student',
    },
    { method: 'POST', url: `/people/guardians/${G}/to-student`, code: 'not_your_family' },
    { method: 'POST', url: `/people/students/${S}/to-guardian`, code: 'not_your_student' },
  ] as const)('$method $url → 403 $code, nothing written', async (route) => {
    const res = await call(app, { ...route, token: 'sales' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([403, route.code]);
    const writes = [mocks.people, mocks.families, mocks.roles].flatMap((m) => Object.values(m));
    expect(writes.filter((fn) => fn.mock.calls.length > 0)).toEqual([]);
  });

  it('a move to an existing family checks that family too', async () => {
    mocks.owners.student.mockResolvedValue(undefined);
    const res = await call(app, {
      method: 'POST',
      url: `/people/students/${S}/guardian`,
      token: 'sales',
      payload: { guardian_id: G },
    });
    expect(res.statusCode).toBe(403);
    expect(mocks.owners.family).toHaveBeenCalledWith(expect.objectContaining({ id: 'sales-1' }), G);
    expect(mocks.families.move).not.toHaveBeenCalled();
  });
});
