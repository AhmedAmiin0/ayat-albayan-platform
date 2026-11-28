import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';

// docs/36 Z-1: the message id of M1-M3 is parsed by zod: a bad id is the 400 validation envelope.

type App = Awaited<ReturnType<typeof whatsappApp>>;

describe('M1-M3 with a bad message id', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());

  it.each(['retry', 'sent-manually', 'hand-off'])(
    'POST /messages/not-a-uuid/%s → 400 validation_failed, nothing read',
    async (action) => {
      const res = await t.call({ method: 'POST', url: `/messages/not-a-uuid/${action}` });
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
      expect(t.messages.get).not.toHaveBeenCalled();
    },
  );
});
