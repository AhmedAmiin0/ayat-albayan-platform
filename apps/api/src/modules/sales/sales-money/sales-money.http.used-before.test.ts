import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemResolver } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { subRow } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, salesDefaults } from './sales-money.fakes';

// «حلقات مستخدمة من الباقة» (owner 2026-10-28, migration 932). The weekly package has 4 lessons.
const NOW = new Date('2026-10-28T10:00:00Z'); // Riyadh today = 2026-10-28
const URL = '/sales/subscriptions';
const PAST = { startsOn: '2026-10-27', alreadyStarted: true };
const withoutSetStart: PermissionResolver = async (user) =>
  (await systemResolver(user)).filter((p) => p !== 'subscriptions.set_start_date');

function suite(resolver: PermissionResolver) {
  const ctx = {} as { app: NestFastifyApplication; m: Mocks; call: Awaited<ReturnType<typeof moneyApp>>['call'] };
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    Object.assign(ctx, await moneyApp(resolver));
  });
  afterAll(async () => {
    await ctx.app.close();
    vi.useRealTimers();
  });
  beforeEach(() => {
    resetMocks(ctx.m);
    salesDefaults(ctx.m);
  });
  return ctx;
}

describe('POST /sales/subscriptions lessonsUsedBefore with subscriptions.set_start_date', () => {
  const ctx = suite(systemResolver);
  const create = (patch: object) => ctx.call({ method: 'POST', url: URL, token: 'salesA', body: { ...CREATE, ...patch } });

  it('with a past start: stored on the row and in the audited row; the view returns it', async () => {
    ctx.m.subs.insert.mockResolvedValue(subRow({ lessons_used_before: 1, starts_on: '2026-10-27' }));
    ctx.m.subs.get.mockResolvedValue(subRow({ lessons_used_before: 1, starts_on: '2026-10-27' }));
    const res = await create({ ...PAST, lessonsUsedBefore: 1 });
    expect(res.statusCode).toBe(201);
    expect(ctx.m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ starts_on: '2026-10-27', lessons_used_before: 1 }));
    const audit = { entity: 'subscriptions', action: 'create', after: expect.objectContaining({ lessons_used_before: 1 }) };
    expect(ctx.m.audit.record).toHaveBeenCalledWith(expect.objectContaining(audit));
    expect(res.json().lessons_used_before).toBe(1);
  });

  it('omitted or 0: stored as 0, any start', async () => {
    expect((await create({})).statusCode).toBe(201);
    expect((await create({ lessonsUsedBefore: 0 })).statusCode).toBe(201);
    expect(ctx.m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ lessons_used_before: 0 }));
  });

  it('without a past start → 400 used_before_needs_past_start, nothing inserted', async () => {
    for (const body of [{ lessonsUsedBefore: 1 }, { startsOn: '2026-10-30', lessonsUsedBefore: 1 }]) {
      const res = await create(body);
      expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_needs_past_start']);
    }
    expect(ctx.m.subs.insert).not.toHaveBeenCalled();
  });

  it('bounds: 3 of 4 passes; 4 of 4 → 400 used_before_too_many; negative or a fraction → 400', async () => {
    expect((await create({ ...PAST, lessonsUsedBefore: 3 })).statusCode).toBe(201);
    ctx.m.subs.insert.mockClear();
    const res = await create({ ...PAST, lessonsUsedBefore: 4 });
    expect([res.statusCode, res.json().code]).toEqual([400, 'used_before_too_many']);
    expect((await create({ ...PAST, lessonsUsedBefore: -1 })).statusCode).toBe(400);
    expect((await create({ ...PAST, lessonsUsedBefore: 1.5 })).statusCode).toBe(400);
    expect(ctx.m.subs.insert).not.toHaveBeenCalled();
  });
});

describe('POST /sales/subscriptions lessonsUsedBefore without subscriptions.set_start_date', () => {
  const ctx = suite(withoutSetStart);

  it('any count above 0 → 403 (the past start itself is refused first)', async () => {
    const body = { ...CREATE, lessonsUsedBefore: 1 };
    const res = await ctx.call({ method: 'POST', url: URL, token: 'salesA', body });
    expect([res.statusCode, res.json().code]).toEqual([403, 'used_before_not_allowed']);
    expect(ctx.m.subs.insert).not.toHaveBeenCalled();
  });
});
