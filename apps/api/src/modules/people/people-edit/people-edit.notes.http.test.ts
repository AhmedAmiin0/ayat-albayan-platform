import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';

// #621 review: notes stay the admin's (owner 2026-10-27, «never notes» for sales), in the edit
// view and in both PATCHes.
describe('/people/* and notes', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await peopleApp();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.people.editStudent.mockResolvedValue({ id: S });
    mocks.people.editGuardian.mockResolvedValue({ id: G });
    mocks.views.view.mockResolvedValue({ student: { id: S }, guardian: { id: G } });
  });
  const patch = (token: string, req: { url: string; payload: object }) =>
    call(app, { method: 'PATCH', token, ...req });
  const STUDENT = { url: `/people/students/${S}`, payload: { notes: 'ملاحظة' } };
  const FAMILY = { url: `/people/guardians/${G}`, payload: { notes: null } };

  it('the assistant: a notes key is 400 on both PATCHes, nothing written', async () => {
    expect((await patch('sales', STUDENT)).statusCode).toBe(400);
    expect((await patch('sales', FAMILY)).statusCode).toBe(400);
    expect(mocks.people.editStudent).not.toHaveBeenCalled();
    expect(mocks.people.editGuardian).not.toHaveBeenCalled();
  });

  it('the admin still edits notes; only the admin is flagged to the family edit', async () => {
    expect((await patch('admin', STUDENT)).statusCode).toBe(200);
    expect((await patch('admin', FAMILY)).statusCode).toBe(200);
    expect(mocks.people.editGuardian).toHaveBeenCalledWith(
      expect.objectContaining({ admin: true }),
    );
    await patch('sales', { url: FAMILY.url, payload: { name: 'أم سهيلة' } });
    expect(mocks.people.editGuardian).toHaveBeenLastCalledWith(
      expect.objectContaining({ admin: false }),
    );
  });

  it('the edit view asks for notes only for the admin', async () => {
    await call(app, { method: 'GET', url: `/people/students/${S}`, token: 'sales' });
    await call(app, { method: 'GET', url: `/people/students/${S}`, token: 'admin' });
    expect(mocks.views.view.mock.calls).toEqual([
      [S, false],
      [S, true],
    ]);
  });

  it('a custom role on the admin base without guardians.write is not the admin', async () => {
    expect((await patch('admin-lite', STUDENT)).statusCode).toBe(400);
    await patch('admin-lite', { url: FAMILY.url, payload: { phone_e164: '+201000000009' } });
    expect(mocks.people.editGuardian).toHaveBeenLastCalledWith(
      expect.objectContaining({ admin: false }),
    );
    await call(app, { method: 'GET', url: `/people/students/${S}`, token: 'admin-lite' });
    expect(mocks.views.view).toHaveBeenLastCalledWith(S, false);
  });
});
