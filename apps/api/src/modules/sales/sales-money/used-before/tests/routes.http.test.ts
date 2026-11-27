import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';
import {
  balanceOf,
  editApp,
  URL,
} from '@/modules/finance/subscriptions/used-before-edit/tests/used-before-edit.test-util';

const BAD_URL = '/subscriptions/x/lessons-used-before';

describe('/subscriptions/:id/lessons-used-before served from its route objects', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof editApp>>['edits'];
  let call: Awaited<ReturnType<typeof editApp>>['call'];

  beforeAll(async () => ({ app, m, call, edits } = await editApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    edits.courseBooked.mockReset().mockResolvedValue(false);
    m.subs.get.mockResolvedValue(subRow({ lessons_used_before: 1 }));
    m.balances.forSubscriptions.mockResolvedValue(balanceOf(2));
  });

  it('a malformed :id answers the validation_failed envelope for GET and PATCH', async () => {
    for (const method of ['GET', 'PATCH'] as const) {
      const body = { lessonsUsedBefore: 1 };
      const res = await call({ method, url: BAD_URL, token: 'salesA', body });
      const answer = [res.statusCode, res.json<{ message: string }>().message];
      expect(answer).toEqual([400, 'validation_failed']);
    }
  });

  it('a stored number outside the answer schema is a 500 response_invalid', async () => {
    m.subs.get.mockResolvedValue(subRow({ lessons_used_before: 1.5 }));
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });
});
