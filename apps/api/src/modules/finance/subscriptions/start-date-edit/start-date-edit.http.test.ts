import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { dayFromToday, startDateApp, URL } from './start-date-edit.test-util';

// «تعديل تاريخ البدء» (owner 2026-11-03): only starts_on, the create's range, audited.
describe('PATCH /subscriptions/:id/start-date: what', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof startDateApp>>['edits'];
  let call: Awaited<ReturnType<typeof startDateApp>>['call'];
  const FROM = dayFromToday(-40);
  const TO = dayFromToday(-10);

  beforeAll(async () => {
    ({ app, m, call, edits } = await startDateApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    resetMocks(m);
    m.subs.get.mockResolvedValue(subRow({ starts_on: FROM }));
    edits.setStartsOn.mockReset().mockResolvedValue(subRow({ starts_on: TO }));
  });

  const edit = (startsOn: string) =>
    call({ method: 'PATCH', url: URL, token: 'salesA', body: { startsOn } });
  const codeOf = async (startsOn: string) => {
    const res = await edit(startsOn);
    return [res.statusCode, res.json().code];
  };

  it('writes starts_on only (if still the day read), audited before / after with the actor', async () => {
    const res = await edit(TO);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ subscription_id: SUB_ID, starts_on: TO });
    expect(edits.setStartsOn).toHaveBeenCalledWith({ id: SUB_ID, from: FROM, to: TO });
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'a1000000-0000-4000-8000-00000000000a',
      entity: 'subscriptions',
      entityId: SUB_ID,
      action: 'update',
      before: expect.objectContaining({ starts_on: FROM }),
      after: expect.objectContaining({ starts_on: TO }),
    }));
    for (const write of [m.payments.insert, m.payments.update, m.subs.update]) {
      expect(write).not.toHaveBeenCalled();
    }
    expect(JSON.stringify(res.json())).not.toContain('price');
  });

  it('a cancelled package → 409 already_cancelled, nothing written', async () => {
    m.subs.get.mockResolvedValue(subRow({ starts_on: FROM, status: 'cancelled' }));
    expect(await codeOf(TO)).toEqual([409, 'already_cancelled']);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
  });

  it('lessons used before: today or later → 400 used_before_needs_past_start; yesterday ok', async () => {
    m.subs.get.mockResolvedValue(subRow({ starts_on: FROM, lessons_used_before: 2 }));
    expect(await codeOf(dayFromToday(0))).toEqual([400, 'used_before_needs_past_start']);
    expect(await codeOf(dayFromToday(30))).toEqual([400, 'used_before_needs_past_start']);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
    expect((await edit(dayFromToday(-1))).statusCode).toBe(200);
  });

  it('nothing counted before: a future day is fine; more than a year back → 400', async () => {
    expect((await edit(dayFromToday(20))).statusCode).toBe(200);
    expect(await codeOf(dayFromToday(-366))).toEqual([400, 'start_date_too_old']);
  });

  it('a concurrent change → 409 start_date_changed, nothing audited', async () => {
    edits.setStartsOn.mockResolvedValue(null);
    expect(await codeOf(TO)).toEqual([409, 'start_date_changed']);
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('the same day: no write, no audit row', async () => {
    expect((await edit(FROM)).statusCode).toBe(200);
    expect(edits.setStartsOn).not.toHaveBeenCalled();
    expect(m.audit.record).not.toHaveBeenCalled();
  });

  it('an unknown package → 404', async () => {
    m.subs.get.mockResolvedValue(null);
    expect((await edit(TO)).statusCode).toBe(404);
  });
});
