import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantApp } from '@/modules/finance/assistant-pay/shared/assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;

const BAD_IDS = [
  ['GET', '/assistant-pay/terms/not-a-uuid', undefined],
  ['PUT', '/assistant-pay/terms/not-a-uuid', { commission: null, salary: null }],
  ['GET', '/assistant-pay/brought-by/not-a-uuid', undefined],
  ['POST', '/assistant-pay/commissions/not-a-uuid/void', { reason: 'counted twice' }],
  ['GET', '/assistant-pay/statements/not-a-uuid', undefined],
  ['GET', '/assistant-pay/statements/not-a-uuid/receipt', undefined],
  ['POST', '/assistant-pay/statements/not-a-uuid/approve', undefined],
  ['POST', '/assistant-pay/statements/not-a-uuid/reopen', undefined],
  ['POST', '/assistant-pay/statements/not-a-uuid/pay', {}],
  ['POST', '/assistant-pay/statements/not-a-uuid/unpay', { reason: 'paid twice' }],
] as const;

describe('assistant pay admin routes: an id that is not a uuid', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each(BAD_IDS)('%s %s answers 400 validation_failed', async (method, url, body) => {
    const res = await t.call({ method, url, token: 'admin', body });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('validation_failed');
    expect(t.terms.get).not.toHaveBeenCalled();
    expect(t.statements.get).not.toHaveBeenCalled();
  });
});
