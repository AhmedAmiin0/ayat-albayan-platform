import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import type { MessageRow } from '../whatsapp/message.mapper';
import { PHONE, threadRow } from './inbox.fakes';
import { ADMIN, inboxApp, SALES, TEACHER } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const SRC = 'a0000000-0000-4000-8000-0000000000f1';
const REQ = 'c0000000-0000-4000-8000-000000000003';
const OPEN = '+966500000001';
const CLOSED = '+966500000002';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const STALE = '2026-01-01T00:00:00Z';
const source = (over: Partial<MessageRow> = {}) =>
  messageRow({ id: SRC, direction: 'inbound', phone_e164: PHONE, body: 'موعد الحلقة غدًا', template_key: null, template_params: null, ...over });
const forward = (over: { targets?: string[]; token?: string } = {}) => ({
  method: 'POST' as const,
  url: '/threads/forward',
  token: over.token ?? 'admin',
  body: { messageId: SRC, targets: over.targets ?? [OPEN, CLOSED], clientRequestId: REQ },
});

describe('POST /threads/forward «إعادة توجيه» (owner 2026-10-25)', () => {
  let t: App;
  let src: MessageRow;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    src = source();
    t.queries.thread.mockImplementation(async (phone: string) =>
      threadRow({ phone_e164: phone, last_inbound_at: phone === CLOSED ? STALE : FRESH }));
    t.queries.get.mockImplementation(async (id: string) => (id === SRC ? src : null));
    t.queries.enqueue.mockImplementation(async (row: Partial<MessageRow>) =>
      messageRow({ ...row, id: `m-${row.phone_e164 ?? ''}`, template_key: null, template_params: null }));
    t.teacher.teacher.mockImplementation(async (id: string) => (id === TEACHER.id ? { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: null } : null));
    t.teacher.phones.mockResolvedValue([PHONE, OPEN]);
  });

  it('copies the text to each open chat; a closed one is skipped with its reason, in request order', async () => {
    const res = await t.call(forward());
    expect(res.statusCode).toBe(201);
    expect(res.json().results).toEqual([
      { phone: OPEN, sent: true, message_id: `m-${OPEN}` },
      { phone: CLOSED, sent: false, reason: 'session_closed' },
    ]);
    expect(t.queries.enqueue).toHaveBeenCalledTimes(1);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      phone_e164: OPEN, body: 'موعد الحلقة غدًا', forwarded_from_id: SRC, created_by: ADMIN.id, dedup_key: `admin:${OPEN}:${REQ}`,
    }));
  });

  it('audits one thread_forward row on the source with who got it and who was skipped', async () => {
    await t.call(forward());
    expect(t.audit.record).toHaveBeenCalledTimes(1);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: ADMIN.id,
      entity: 'messages',
      entityId: SRC,
      action: 'thread_forward',
      after: expect.objectContaining({
        sent: [{ phone: OPEN, message_id: `m-${OPEN}` }],
        skipped: [{ phone: CLOSED, reason: 'session_closed' }],
      }),
    }));
  });

  it('a retried forward whose copies all exist answers the same rows and is not audited again', async () => {
    t.queries.enqueue.mockImplementation(async (row: Partial<MessageRow>) =>
      ({ ...messageRow({ ...row, id: `m-${row.phone_e164 ?? ''}`, status: 'sent', template_key: null }), replayed: true }));
    const res = await t.call(forward({ targets: [OPEN] }));
    expect(res.json().results).toEqual([{ phone: OPEN, sent: true, message_id: `m-${OPEN}` }]);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('a salesperson forwards under her own dedup space and id', async () => {
    await t.call(forward({ targets: [OPEN], token: 'sales' }));
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: `sales:${SALES.id}:${OPEN}:${REQ}`, forwarded_from_id: SRC }));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: expect.objectContaining({ sales_id: SALES.id }) }));
  });

  it('a teacher: a target outside their families is skipped as not_your_thread, theirs gets it', async () => {
    const res = await t.call(forward({ token: 'teacher', targets: [OPEN, CLOSED] }));
    expect(res.json().results).toEqual([
      { phone: OPEN, sent: true, message_id: `m-${OPEN}` },
      { phone: CLOSED, sent: false, reason: 'not_your_thread' },
    ]);
  });

  it("404 for a message the teacher cannot read, a template's 400, nothing queued", async () => {
    src = source({ phone_e164: CLOSED });
    const hidden = await t.call(forward({ token: 'teacher' }));
    expect([hidden.statusCode, hidden.json().code]).toEqual([404, 'message_not_found']);
    src = source({ template_key: 'trial_reminder', body: null });
    const template = await t.call(forward());
    expect([template.statusCode, template.json().code]).toEqual([400, 'not_forwardable']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('400 on six targets or a duplicate; 404 for an unknown message', async () => {
    const six = ['+966500000011', '+966500000012', '+966500000013', '+966500000014', '+966500000015', '+966500000016'];
    expect((await t.call(forward({ targets: six }))).statusCode).toBe(400);
    expect((await t.call(forward({ targets: [OPEN, OPEN] }))).statusCode).toBe(400);
    t.queries.get.mockResolvedValue(null);
    expect((await t.call(forward())).statusCode).toBe(404);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a guardian (no inbox.send) gets 403', async () => {
    expect((await t.call(forward({ token: 'guardian' }))).statusCode).toBe(403);
  });
});
