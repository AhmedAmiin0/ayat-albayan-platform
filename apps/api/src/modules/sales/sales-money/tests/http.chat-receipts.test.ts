import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { FAMILY_PHONE, salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';

type Call = Awaited<ReturnType<typeof salesMoneyApp>>['call'];

const image = (id: string) => ({
  id,
  phone_e164: FAMILY_PHONE,
  direction: 'inbound',
  media_id: 'm',
  media_mime: 'image/jpeg',
  media_path: null,
  body: null,
  created_at: new Date().toISOString(),
  line: 'chat',
  interactive_payload: { type: 'image' },
});
const LIST = `/sales/money/chat-receipts?studentId=${STUDENT_ID}`;

describe('/sales/money/chat-receipts served from its route objects', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Call;

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('a receipt row whose id is not a uuid is a 500 response_invalid, never sent', async () => {
    m.mediaQueries.receipts.mockResolvedValue([image('not-a-uuid')]);
    const res = await call({ method: 'GET', url: LIST, token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([
      500,
      expect.objectContaining({ code: 'response_invalid' }),
    ]);
  });

  it('a chat without receipts answers an empty list', async () => {
    m.mediaQueries.receipts.mockResolvedValue([]);
    const res = await call({ method: 'GET', url: LIST, token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, []]);
  });

  it('a message id that is not a uuid is a 400 before anything is read', async () => {
    const url = `/sales/money/chat-receipts/nope?studentId=${STUDENT_ID}`;
    const res = await call({ method: 'GET', url, token: 'salesA' });
    expect(res.statusCode).toBe(400);
    expect(m.mediaQueries.message).not.toHaveBeenCalled();
  });

  it('a list without its student is a 400', async () => {
    const res = await call({ method: 'GET', url: '/sales/money/chat-receipts', token: 'salesA' });
    expect(res.statusCode).toBe(400);
    expect(m.mediaQueries.receipts).not.toHaveBeenCalled();
  });
});
