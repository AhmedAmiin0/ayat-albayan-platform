import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const M1 = 'b1111111-1111-4111-8111-111111111111';
const urlOf = (phone: string, id: string) =>
  `/threads/${encodeURIComponent(phone)}/messages/${id}/hide`;

describe('POST/DELETE /threads/:phone/messages/:messageId/hide with bad params', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const nothingRead = () => {
    expect(t.hides.target).not.toHaveBeenCalled();
    expect(t.hides.set).not.toHaveBeenCalled();
  };

  it('a bad phone is 400 invalid_phone, even with a bad id', async () => {
    for (const id of [M1, 'nope']) {
      const res = await t.call({ method: 'POST', url: urlOf('abc', id) });
      expect([res.statusCode, res.json().code]).toEqual([400, 'invalid_phone']);
    }
    nothingRead();
  });

  it('a bad id is the 400 validation_failed envelope on hide and show', async () => {
    for (const method of ['POST', 'DELETE'] as const) {
      const res = await t.call({ method, url: urlOf(PHONE, 'nope'), token: 'admin' });
      expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
    }
    nothingRead();
  });
});
