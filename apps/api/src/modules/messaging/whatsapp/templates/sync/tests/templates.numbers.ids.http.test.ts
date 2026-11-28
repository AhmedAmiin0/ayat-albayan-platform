import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';

// docs/36 Z-1: the number id is parsed by zod: a bad id is the 400 validation envelope.

type App = Awaited<ReturnType<typeof whatsappApp>>;

describe('POST /admin/numbers/:id/templates/sync with a bad id', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());

  it('400 validation_failed', async () => {
    const res = await t.call({ method: 'POST', url: '/admin/numbers/not-a-uuid/templates/sync' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
  });
});
