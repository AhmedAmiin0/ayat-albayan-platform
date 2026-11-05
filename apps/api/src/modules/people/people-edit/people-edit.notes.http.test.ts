import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';
const VIEW = {
  student: { id: S, name: 'سهيلة', notes: 'ملاحظة الطالب' },
  guardian: { id: G, name: 'أم سهيلة', notes: 'ملاحظة العائلة' },
};

// Merge gate #3 (owner 2026-10-27 whitelist): sales never read or write students' or families'
// notes; the admin does. The edits also tell the service whether the actor is the admin (#1).
describe('/people/* notes and the sales role', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await peopleApp();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.views.view.mockResolvedValue(VIEW);
    mocks.people.editStudent.mockResolvedValue({ id: S });
    mocks.people.editGuardian.mockResolvedValue({ id: G });
  });
  const send = (token: string, url: string, payload: object) =>
    call(app, { method: 'PATCH', url, token, payload });

  it('the edit view has no notes for sales, both for the admin', async () => {
    const get = (token: string) =>
      call(app, { method: 'GET', url: `/people/students/${S}`, token });
    const sales = (await get('sales')).json<typeof VIEW>();
    expect(sales.student).toEqual({ id: S, name: 'سهيلة' });
    expect(sales.guardian).toEqual({ id: G, name: 'أم سهيلة' });
    expect((await get('admin')).json()).toEqual(VIEW);
  });

  it.each([
    { url: `/people/students/${S}`, mock: mocks.people.editStudent },
    { url: `/people/guardians/${G}`, mock: mocks.people.editGuardian },
  ])('sales: a notes field on $url → 400, nothing written', async ({ url, mock }) => {
    expect((await send('sales', url, { name: 'اسم', notes: 'x' })).statusCode).toBe(400);
    expect((await send('sales', url, { notes: null })).statusCode).toBe(400);
    expect(mock).not.toHaveBeenCalled();
    expect((await send('sales', url, { name: 'اسم' })).statusCode).toBe(200);
  });

  it('the admin edits notes', async () => {
    expect((await send('admin', `/people/students/${S}`, { notes: 'x' })).statusCode).toBe(200);
    expect(mocks.people.editStudent).toHaveBeenCalledWith(
      expect.objectContaining({ patch: { notes: 'x' } }),
    );
    expect((await send('admin', `/people/guardians/${G}`, { notes: 'y' })).statusCode).toBe(200);
  });

  it('a family edit names whether the actor is the admin (the main-number rule)', async () => {
    await send('sales', `/people/guardians/${G}`, { phone_e164: '+201000000009' });
    await send('admin', `/people/guardians/${G}`, { phone_e164: '+201000000009' });
    // A custom role on the admin base without guardians.write stays bound by the rule.
    await send('admin-lite', `/people/guardians/${G}`, { phone_e164: '+201000000009' });
    expect(mocks.people.editGuardian.mock.calls).toEqual([
      [expect.objectContaining({ admin: false })],
      [expect.objectContaining({ admin: true })],
      [expect.objectContaining({ admin: false })],
    ]);
  });
});
