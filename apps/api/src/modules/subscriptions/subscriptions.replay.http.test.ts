import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, subRow, SUB_ID, WEEKLY_SA } from './money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from './test-app';

// Rule 8 on POST /subscriptions: one clientRequestId per subscribe form, re-sent on every retry.
const REQUEST = '00000000-0000-4000-8000-0000000000aa';
const create = { studentId: STUDENT_ID, startsOn: '2026-10-01', pricing: { tier: 'weekly' }, clientRequestId: REQUEST };

describe('POST /subscriptions retries (rule 8) and the lead (R-LEAD-01)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.get.mockResolvedValue(subRow());
  });

  it('stores the key and converts the family’s lead once the package exists', async () => {
    m.subs.insert.mockResolvedValue(subRow());
    expect((await call({ method: 'POST', url: '/subscriptions', body: create })).statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ client_request_id: REQUEST }));
    expect(m.leads.afterPackage).toHaveBeenCalledWith(STUDENT_ID, ADMIN.id);
  });

  it('a retry after a lost reply returns the first package: no second row, no second conversion', async () => {
    m.subs.byRequest.mockResolvedValue(subRow());
    const res = await call({ method: 'POST', url: '/subscriptions', body: create });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: SUB_ID });
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect(m.leads.afterPackage).not.toHaveBeenCalled();
  });

  it('two saves at once: the loser hits the unique key and returns the winner’s package', async () => {
    m.subs.insert.mockResolvedValue(null);
    m.subs.byRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(subRow());
    const res = await call({ method: 'POST', url: '/subscriptions', body: create });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: SUB_ID });
    expect(m.audit.record).not.toHaveBeenCalled();
    expect(m.leads.afterPackage).not.toHaveBeenCalled();
  });

  it('rejects a key that is not a uuid', async () => {
    const res = await call({ method: 'POST', url: '/subscriptions', body: { ...create, clientRequestId: 'x' } });
    expect(res.statusCode).toBe(400);
  });
});
