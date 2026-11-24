import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOREIGN_MESSAGE,
  FOREIGN_PHONE,
  teachesOwnFamily,
  threadUrl,
} from '@/modules/messaging/inbox/foreign-id.fakes';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const urlOf = (phone: string) => `${threadUrl(phone)}/messages/${FOREIGN_MESSAGE}/hide`;
const foreignTarget = {
  id: FOREIGN_MESSAGE,
  phone_e164: FOREIGN_PHONE,
  template_key: null,
  hidden_at: '2026-10-30T10:00:00.000Z',
};

describe('POST/DELETE /threads/:phone/messages/:id/hide with another user\'s ids', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachesOwnFamily(t);
    t.hides.target.mockResolvedValue(foreignTarget);
    t.hides.set.mockResolvedValue(true);
  });

  const nothingChanged = () => {
    expect(t.hides.set).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  };

  it('a teacher on another teacher\'s family is 403 on hide and show, nothing read', async () => {
    for (const method of ['POST', 'DELETE'] as const) {
      const res = await t.call({ method, url: urlOf(FOREIGN_PHONE), token: 'teacher' });
      expect(res.statusCode).toBe(403);
    }
    expect(t.hides.target).not.toHaveBeenCalled();
    nothingChanged();
  });

  it('a salesperson hiding another chat\'s message under this phone is 404', async () => {
    const res = await t.call({ method: 'POST', url: urlOf(PHONE), token: 'sales' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    nothingChanged();
  });

  it('a salesperson cannot show a hidden message of any chat: 403, nothing read', async () => {
    const res = await t.call({ method: 'DELETE', url: urlOf(FOREIGN_PHONE), token: 'sales' });
    expect(res.statusCode).toBe(403);
    expect(t.hides.target).not.toHaveBeenCalled();
    nothingChanged();
  });

  it('the admin showing another chat\'s message under this phone is 404 too', async () => {
    const res = await t.call({ method: 'DELETE', url: urlOf(PHONE), token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'message_not_found']);
    nothingChanged();
  });
});
