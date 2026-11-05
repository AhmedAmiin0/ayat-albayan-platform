import { reopenDedupKey } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { templateRow } from '../../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from '../inbox.fakes';
import { ADMIN, inboxApp } from '../test-app';

// POST /threads/:phone/reopen (owner 2026-10-26). Fakes only: Kapso is the KapsoReopener mock, the
// sender is mocked, nothing leaves the process.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/reopen`;
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const STALE = '2026-01-01T00:00:00Z';
// Owner 2026-11-03: the reopen template is an approved chat-line starter with no variables.
const REOPEN = templateRow({ key: 'inquiry_followup_ar_v2', meta_name: 'inquiry_followup_ar_v2', line: 'chat', params: [], buttons: [], body_ar: 'أهلًا', sales_starter: true });
const reopen = (token = 'admin') => t.call({ method: 'POST', url: URL, token });
let t: App;

describe('POST /threads/:phone/reopen', () => {
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.reopens.templateKey.mockResolvedValue('inquiry_followup_ar_v2');
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: STALE }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockResolvedValue(null);
    t.templates.get.mockResolvedValue(REOPEN);
    t.reopens.nextKey.mockResolvedValue(reopenDedupKey(PHONE, new Date()));
    t.kapso.reopen.mockResolvedValue(true);
  });

  it('window open: nothing at all', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    const res = await reopen();
    expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: false, template: 'window_open' }]);
    expect(t.kapso.reopen).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('closed: Kapso reopened and ONE template row queued through the outbox as the staff member', async () => {
    const res = await reopen();
    expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: true, template: 'template_queued' }]);
    expect(t.kapso.reopen).toHaveBeenCalledWith(PHONE);
    expect(t.queries.enqueue).toHaveBeenCalledTimes(1);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'outbound', status: 'queued', phone_e164: PHONE, created_by: ADMIN.id,
      template_key: 'inquiry_followup_ar_v2', template_params: {},
      dedup_key: reopenDedupKey(PHONE, new Date()),
    }));
    // It never goes out late: 24 h, as the sender's own reopen row (merge-gate review 2026-11-05).
    const [[queued]] = t.queries.enqueue.mock.calls as [[{ expires_at?: string }]];
    expect(Date.parse(queued.expires_at ?? '') - Date.now()).toBeGreaterThan(23 * 3_600_000);
    // The sender (and its gate) decides whether it goes out, as for any send; audited like the composer's.
    expect(t.sender.kick).toHaveBeenCalledTimes(1);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN.id, action: 'thread_reopen_template', entityId: 'm9' }));
  });

  it("today's first try failed: the next try's own key, so the dedup never swallows it", async () => {
    t.reopens.nextKey.mockResolvedValue(`${reopenDedupKey(PHONE, new Date())}:2`);
    expect((await reopen()).json().template).toBe('template_queued');
    expect(t.queries.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ dedup_key: `${reopenDedupKey(PHONE, new Date())}:2` }),
    );
  });

  it('a reopen pending or sent in the last 24 h (or no try left today): nothing queued', async () => {
    t.reopens.nextKey.mockResolvedValue(null);
    const res = await reopen();
    expect(res.json()).toEqual({ kapso_reopened: true, template: 'already_requested_today' });
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a second open the same day hits the per-day dedup key: nothing new', async () => {
    t.queries.enqueue.mockImplementation(async (row: object) => ({ ...messageRow({ ...row, id: 'm9', status: 'sent' }), replayed: true }));
    const res = await reopen();
    expect(res.json()).toEqual({ kapso_reopened: true, template: 'already_requested_today' });
    expect(t.sender.kick).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('no thread for that phone: nothing at all', async () => {
    t.queries.thread.mockResolvedValue(null);
    expect((await reopen()).json()).toEqual({ kapso_reopened: false, template: 'not_sent' });
    expect(t.kapso.reopen).not.toHaveBeenCalled();
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a restricted role (sales): Kapso only, never the template', async () => {
    const res = await reopen('sales');
    expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: true, template: 'not_allowed' }]);
    expect(t.kapso.reopen).toHaveBeenCalledTimes(1);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('Kapso failed (reopener answers false): still 200 and the template queued', async () => {
    t.kapso.reopen.mockResolvedValue(false);
    const res = await reopen();
    expect([res.statusCode, res.json()]).toEqual([200, { kapso_reopened: false, template: 'template_queued' }]);
  });

  it('a template with a variable, or not a starter: template_unavailable, nothing queued', async () => {
    t.templates.get.mockResolvedValue({ ...REOPEN, params: ['var_1'] });
    expect((await reopen()).json().template).toBe('template_unavailable');
    t.templates.get.mockResolvedValue({ ...REOPEN, sales_starter: false });
    expect((await reopen()).json().template).toBe('template_unavailable');
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a guardian (no inbox.send) is refused; a bad phone is 400', async () => {
    expect((await reopen('guardian')).statusCode).toBe(403);
    expect((await t.call({ method: 'POST', url: '/threads/abc/reopen' })).statusCode).toBe(400);
  });
});
