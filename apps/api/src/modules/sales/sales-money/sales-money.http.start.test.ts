import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';

// 2026-10-12 13:00 in Riyadh: today = 2026-10-12.
const NOW = new Date('2026-10-12T10:00:00Z');
const URL = '/sales/subscriptions';

describe('POST /sales/subscriptions with subscriptions.set_start_date (docs/16 row 24)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    ({ app, m, call } = await moneyApp());
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

  it('no day sent: today in Riyadh is stored', async () => {
    expect((await create({})).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-12' }));
  });

  it('a future day is stored as sent; alreadyStarted never reaches the row', async () => {
    expect((await create({ startsOn: '2026-10-20' })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-20' }));
    expect(m.subs.insert.mock.calls[0]?.[0]).not.toHaveProperty('alreadyStarted');
  });

  it('a past day without «بدأ الاشتراك سابقًا» → 400 start_date_past, nothing priced or inserted', async () => {
    const res = await create({ startsOn: '2026-10-10' });
    expect([res.statusCode, res.json().code]).toEqual([400, 'start_date_past']);
    expect(m.pricing.quote).not.toHaveBeenCalled();
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it("an old app's family day (Riyadh's yesterday, no alreadyStarted) is read as today", async () => {
    expect((await create({ startsOn: '2026-10-11' })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-12' }));
  });

  it('yesterday with alreadyStarted stays yesterday', async () => {
    expect((await create({ startsOn: '2026-10-11', alreadyStarted: true })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-11' }));
  });

  it('a past day with alreadyStarted is stored (no backfill: only the row)', async () => {
    expect((await create({ startsOn: '2026-01-15', alreadyStarted: true })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-01-15', renews_on: null }));
  });

  it('exactly a year back passes; more than 365 days → 400 start_date_too_old', async () => {
    expect((await create({ startsOn: '2025-10-12', alreadyStarted: true })).statusCode).toBe(201);
    m.subs.insert.mockClear();
    const res = await create({ startsOn: '2025-10-11', alreadyStarted: true });
    expect([res.statusCode, res.json().code]).toEqual([400, 'start_date_too_old']);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('ownership and the discount are checked first', async () => {
    const other = await call({ method: 'POST', url: URL, token: 'salesB', body: { ...CREATE, startsOn: '2026-10-11' } });
    expect([other.statusCode, other.json().code]).toEqual([403, 'not_your_student']);
    const pill = await create({ startsOn: '2026-10-11', pricing: { tier: 'weekly', discount: 20 } });
    expect(pill.json().code).toBe('discount_not_allowed');
  });
});
