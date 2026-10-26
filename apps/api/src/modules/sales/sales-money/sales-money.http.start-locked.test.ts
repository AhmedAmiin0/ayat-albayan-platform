import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemResolver } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { moneyApp, resetMocks, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';

const NOW = new Date('2026-10-12T10:00:00Z'); // Riyadh today = 2026-10-12
const URL = '/sales/subscriptions';
/** The sales role with subscriptions.set_start_date taken away by the admin (an editable system role). */
const withoutSetStart: PermissionResolver = async (user) =>
  (await systemResolver(user)).filter((p) => p !== 'subscriptions.set_start_date');

describe('POST /sales/subscriptions without subscriptions.set_start_date: always today', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    ({ app, m, call } = await moneyApp(withoutSetStart));
  });
  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  const create = (patch: object) => call({ method: 'POST', url: URL, token: 'salesA', body: { ...CREATE, ...patch } });

  it("no day sent (or today, or an old app's family yesterday): today in Riyadh", async () => {
    expect((await create({})).statusCode).toBe(201);
    expect((await create({ startsOn: '2026-10-12' })).statusCode).toBe(201);
    expect((await create({ startsOn: '2026-10-11' })).statusCode).toBe(201);
    expect(m.subs.insert).not.toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-11' }));
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-12' }));
  });

  it.each(['2026-10-20', '2026-10-10'])('an explicit other day %s → 403 start_date_not_allowed, nothing inserted', async (day) => {
    const res = await create({ startsOn: day });
    expect([res.statusCode, res.json().code]).toEqual([403, 'start_date_not_allowed']);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('alreadyStarted → 403 start_date_not_allowed', async () => {
    const res = await create({ alreadyStarted: true });
    expect([res.statusCode, res.json().code]).toEqual([403, 'start_date_not_allowed']);
    expect(m.pricing.quote).not.toHaveBeenCalled();
  });
});
