import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { whatsappApp } from '@/modules/messaging/whatsapp/test-app';

// POST /messages/:id/app-send (docs/19): admin only (messages.manage), zod on the id, audited.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const ID = 'b0000000-0000-4000-8000-000000000009';
const held = messageRow({
  id: ID,
  status: 'queued',
  error_code: 'awaiting_reply',
  created_by: 'u0000000-0000-4000-8000-000000000001',
  template_key: null,
  template_params: null,
  body: 'السلام عليكم',
});

describe('POST /messages/:id/app-send', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.resetAllMocks());

  it('a held staff text: 200 with the pending window, audited', async () => {
    const until = '2026-11-06T10:10:00.000Z';
    t.appSend.get.mockResolvedValue(held);
    t.appSend.start.mockResolvedValue({ ...held, app_send_until: until });
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/app-send` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'queued', app_send_until: until });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'message_app_send' }));
  });

  it('a row already sent: 409 not_app_send with its status, nothing written', async () => {
    t.appSend.get.mockResolvedValue({ ...held, status: 'sent', error_code: null });
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/app-send` });
    expect([res.statusCode, res.json()]).toMatchObject([409, { code: 'not_app_send', status: 'sent' }]);
    expect(t.appSend.start).not.toHaveBeenCalled();
  });

  it('not a uuid: 400 from the zod param, nothing read', async () => {
    const res = await t.call({ method: 'POST', url: '/messages/not-a-uuid/app-send' });
    expect(res.statusCode).toBe(400);
    expect(t.appSend.get).not.toHaveBeenCalled();
  });

  it('a teacher: 403', async () => {
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/app-send`, token: 'teacher' });
    expect(res.statusCode).toBe(403);
  });
});
