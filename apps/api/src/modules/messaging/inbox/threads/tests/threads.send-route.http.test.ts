import { threadSendRoutes as routes } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { inboxApp } from '@/modules/messaging/inbox/test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000001';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const PARAMS = { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' };

describe('text and template sends on their shared route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9' }));
    t.templates.get.mockResolvedValue(templateRow());
  });

  it('answers a text with a row its route reads, saying it did not replay', async () => {
    const body = { text: 'أهلًا', clientRequestId: REQ };
    const res = await t.call({ method: 'POST', url: `${URL}/text`, body });
    expect(res.statusCode).toBe(201);
    const answer = routes.text.response.parse(res.json());
    expect([answer.replayed, answer.same_request]).toEqual([false, false]);
  });

  it('answers a template with a row its route reads', async () => {
    const body = { key: 'booking_confirmation', params: PARAMS, clientRequestId: REQ };
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body });
    expect(res.statusCode).toBe(201);
    expect(routes.template.response.safeParse(res.json()).success).toBe(true);
  });

  it('checks the body before the phone, then answers a bad phone invalid_phone', async () => {
    const badBody = await t.call({ method: 'POST', url: '/threads/abc/text', body: { text: ' ' } });
    expect([badBody.statusCode, badBody.json().code]).toEqual([400, 'validation_failed']);
    const body = { text: 'أهلًا', clientRequestId: REQ };
    const badPhone = await t.call({ method: 'POST', url: '/threads/abc/text', body });
    expect([badPhone.statusCode, badPhone.json().code]).toEqual([400, 'invalid_phone']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });
});
