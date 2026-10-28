import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { inboxApp } from '../test-app';

// A family's only recent message went to the calls number (docs/28 §10): no messaging window is open, so
// «إعادة فتح» still reopens with the template (never `window_open`), whatever line the template is on.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/reopen`;
const STALE = '2026-01-01T00:00:00Z';
let t: App;

describe('POST /threads/:phone/reopen after a message to the calls number', () => {
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    const recent = new Date(Date.now() - 3_600_000).toISOString();
    t.reopens.templateKey.mockResolvedValue('inquiry_followup_ar_v2');
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: recent, last_inbound_line: 'calls', last_chat_inbound_at: STALE, last_notifications_inbound_at: STALE }));
    t.queries.enqueue.mockImplementation(async (r: object) => messageRow({ ...r, id: 'm9', status: 'queued' }));
    t.queries.get.mockResolvedValue(null);
    t.templates.get.mockResolvedValue(templateRow({ key: 'inquiry_followup_ar_v2', meta_name: 'inquiry_followup_ar_v2', line: 'chat', params: ['contact_name'], buttons: [], body_ar: 'أهلًا {{1}}' }));
    t.reopens.requestedSince.mockResolvedValue(false);
    t.kapso.reopen.mockResolvedValue(true);
  });

  it('queues the reopen template (not window_open, not template_unavailable)', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'admin' });
    expect(res.json()).toEqual({ kapso_reopened: true, template: 'template_queued' });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'inquiry_followup_ar_v2' }));
  });
});
