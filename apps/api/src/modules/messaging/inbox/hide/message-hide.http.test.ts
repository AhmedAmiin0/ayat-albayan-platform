import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const M1 = 'b1111111-1111-4111-8111-111111111111';
const URL = `/threads/${encodeURIComponent(PHONE)}/messages/${M1}/hide`;
const target = (over = {}) => ({
  id: M1,
  phone_e164: PHONE,
  template_key: null,
  hidden_at: null,
  ...over,
});

// «حذف من المنصة» (owner 2026-10-30): staff only, never sent to WhatsApp, audited.
describe('POST/DELETE /threads/:phone/messages/:id/hide', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.hides.target.mockResolvedValue(target());
    t.hides.set.mockResolvedValue(true);
  });

  it('the admin and sales hide: stamped with who, audited, nothing sent to WhatsApp', async () => {
    for (const token of ['admin', 'sales']) {
      expect((await t.call({ method: 'POST', url: URL, token })).statusCode).toBe(204);
    }
    expect(t.hides.set).toHaveBeenCalledWith(expect.objectContaining({ id: M1, by: 's1' }));
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'messages',
        entityId: M1,
        action: 'message_hidden',
        actorId: 's1',
      }),
    );
    expect(t.sender.kick).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a teacher (teacher mode) and a guardian cannot hide: 403, nothing changes', async () => {
    for (const token of ['teacher', 'guardian']) {
      expect((await t.call({ method: 'POST', url: URL, token })).statusCode).toBe(403);
    }
    expect(t.hides.set).not.toHaveBeenCalled();
  });

  it('only the admin shows it again («إظهار»): sales is 403; audited with the earlier stamp', async () => {
    t.hides.target.mockResolvedValue(target({ hidden_at: '2026-10-30T10:00:00.000Z' }));
    expect((await t.call({ method: 'DELETE', url: URL, token: 'sales' })).statusCode).toBe(403);
    expect((await t.call({ method: 'DELETE', url: URL, token: 'admin' })).statusCode).toBe(204);
    expect(t.hides.set).toHaveBeenCalledWith(expect.objectContaining({ id: M1, by: null }));
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'message_unhidden',
        before: { hidden_at: '2026-10-30T10:00:00.000Z' },
      }),
    );
  });

  it("another chat's message, an unknown one, or a link template for sales: 404 message_not_found", async () => {
    t.hides.target
      .mockResolvedValueOnce(target({ phone_e164: '+201001234567' }))
      .mockResolvedValueOnce(null);
    for (let i = 0; i < 2; i += 1) {
      const res = await t.call({ method: 'POST', url: URL });
      expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    }
    t.hides.target.mockResolvedValueOnce(target({ template_key: 'lesson_join_link' }));
    expect((await t.call({ method: 'POST', url: URL, token: 'sales' })).statusCode).toBe(404);
    expect(t.hides.set).not.toHaveBeenCalled();
  });

  it('a repeated hide is 204 with no second audit row; a bad id is 400', async () => {
    t.hides.set.mockResolvedValue(false);
    expect((await t.call({ method: 'POST', url: URL })).statusCode).toBe(204);
    expect(t.audit.record).not.toHaveBeenCalled();
    expect(
      (
        await t.call({
          method: 'POST',
          url: `/threads/${encodeURIComponent(PHONE)}/messages/nope/hide`,
        })
      ).statusCode,
    ).toBe(400);
  });
});
