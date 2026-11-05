import { systemPermissionsOf } from '@ab/shared';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { dayFromToday, startDateApp, URL } from './start-date-edit.test-util';

// «تعديل تاريخ البدء» (owner 2026-11-03): subscriptions.edit_terms only, never set_start_date.
describe('PATCH /subscriptions/:id/start-date: who', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof startDateApp>>['edits'];
  let call: Awaited<ReturnType<typeof startDateApp>>['call'];

  beforeAll(async () => {
    ({ app, m, call, edits } = await startDateApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    resetMocks(m);
    m.subs.get.mockResolvedValue(subRow());
    edits.setStartsOn.mockReset().mockResolvedValue(subRow({ starts_on: dayFromToday(-3) }));
  });

  type Token = 'admin' | 'salesA' | 'salesB' | 'teacher';
  const edit = (token: Token) =>
    call({ method: 'PATCH', url: URL, token, body: { startsOn: dayFromToday(-3) } });

  it('a normal assistant (subscriptions.set_start_date only) → 403, nothing written', async () => {
    expect(systemPermissionsOf('sales')).toContain('subscriptions.set_start_date');
    expect((await edit('salesB')).statusCode).toBe(403);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('a teacher → 403', async () => {
    expect((await edit('teacher')).statusCode).toBe(403);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
  });

  it('the special assistant (edit_terms) → 200; the admin → 200', async () => {
    expect((await edit('salesA')).statusCode).toBe(200);
    expect((await edit('admin')).statusCode).toBe(200);
  });

  it('a strict body: 400 for another key, a free-text day or a missing day', async () => {
    const send = (body: object) => call({ method: 'PATCH', url: URL, token: 'salesA', body });
    expect((await send({ startsOn: dayFromToday(-3), renewsOn: dayFromToday(30) })).statusCode)
      .toBe(400);
    expect((await send({ startsOn: 'tomorrow' })).statusCode).toBe(400);
    expect((await send({})).statusCode).toBe(400);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
  });
});
