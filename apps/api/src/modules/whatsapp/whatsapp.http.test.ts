import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { toMetaTemplate } from './meta-shapes';
import { messageRow } from './sender.fakes';
import { ADMIN, whatsappApp } from './test-app';
import { RENEWAL_DUE_SEED, REPORT_READY_SEED } from './seed-templates.fakes';
import { RECORDED, templateRow } from './whatsapp.fakes';

type App = Awaited<ReturnType<typeof whatsappApp>>;
const ID = 'b0000000-0000-4000-8000-000000000009';
const recorded = RECORDED.templates.body.data.map((t) => toMetaTemplate({ ...t, components: [...t.components] }));

describe('WhatsApp admin routes T1–T3, M1–M2 (docs/12 §4)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.client.configured.mockReturnValue(true);
    t.templates.all.mockResolvedValue([templateRow()]);
    t.templates.get.mockResolvedValue(templateRow());
    t.templates.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
    t.storage.signedDownload.mockResolvedValue({ url: 'https://storage.local/r.pdf', expires_at: 'x' });
  });

  it('every write is admin only (teacher reads: whatsapp.teacher.http.test)', async () => {
    for (const [method, url] of [
      ['POST', '/messaging/templates/health'],
      ['POST', '/messaging/templates/renewal_due/submit'],
      ['POST', `/messages/${ID}/retry`],
      ['POST', `/messages/${ID}/sent-manually`],
      ['POST', `/messages/${ID}/hand-off`],
    ] as const) {
      expect((await t.call({ method, url, token: 'teacher' })).statusCode).toBe(403);
    }
    expect(t.client.submitTemplate).not.toHaveBeenCalled();
  });

  it('T1 lists the registry as TemplateView', async () => {
    const res = await t.call({ method: 'GET', url: '/messaging/templates' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([expect.objectContaining({ key: 'booking_confirmation', params: ['student_names', 'lesson_when'], status: 'approved' })]);
  });

  it('T2 health syncs from Meta (200); 503 when WhatsApp is not configured', async () => {
    t.client.getTemplates.mockResolvedValue(recorded);
    const res = await t.call({ method: 'POST', url: '/messaging/templates/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0]).toMatchObject({ key: 'booking_confirmation', quality: 'GREEN' });
    t.client.configured.mockReturnValue(false);
    const off = await t.call({ method: 'POST', url: '/messaging/templates/health' });
    expect([off.statusCode, off.json().code]).toEqual([503, 'not_configured']);
  });

  it('T3 submits only on the admin’s request, audited; a document template without WA_APP_ID is 409 needs_app_id', async () => {
    t.templates.get.mockResolvedValue(RENEWAL_DUE_SEED);
    t.client.submitTemplate.mockResolvedValue({ metaId: 'meta-9', status: 'PENDING' });
    const res = await t.call({ method: 'POST', url: '/messaging/templates/renewal_due/submit' });
    expect([res.statusCode, res.json().status]).toEqual([200, 'pending']);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN.id, action: 'template_submitted' }));
    t.templates.get.mockResolvedValue(REPORT_READY_SEED);
    t.client.canUploadSamples.mockReturnValue(false);
    const doc = await t.call({ method: 'POST', url: '/messaging/templates/report_ready/submit' });
    expect([doc.statusCode, doc.json().code]).toEqual([409, 'needs_app_id']);
    expect(t.client.uploadSample).not.toHaveBeenCalled();
  });

  it('M1 retry: a failed row goes back to the queue, the sender is kicked, audited', async () => {
    t.messages.get.mockResolvedValue(messageRow({ id: ID, status: 'failed', error_code: '131026', attempts: 3 }));
    t.messages.requeue.mockResolvedValue(messageRow({ id: ID, status: 'queued', attempts: 0 }));
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/retry` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: ID, status: 'queued', attempts: 0, click_to_chat: expect.stringMatching(/^https:\/\/wa\.me\/966551234567\?text=/) });
    expect(t.sender.kick).toHaveBeenCalled();
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'messages', entityId: ID, action: 'message_retry', before: { status: 'failed', attempts: 3, error_code: '131026' },
    }));
  });

  it('M1: 404 unknown, 409 not_retryable unless failed, 400 for a non-uuid id', async () => {
    t.messages.get.mockResolvedValueOnce(null);
    expect((await t.call({ method: 'POST', url: `/messages/${ID}/retry` })).statusCode).toBe(404);
    t.messages.get.mockResolvedValueOnce(messageRow({ status: 'sent' }));
    const sent = await t.call({ method: 'POST', url: `/messages/${ID}/retry` });
    expect([sent.statusCode, sent.json().code]).toEqual([409, 'not_retryable']);
    t.messages.get.mockResolvedValueOnce(messageRow({ status: 'failed' }));
    t.messages.requeue.mockResolvedValueOnce(null);
    expect((await t.call({ method: 'POST', url: `/messages/${ID}/retry` })).statusCode).toBe(409);
    expect((await t.call({ method: 'POST', url: '/messages/nope/retry' })).statusCode).toBe(400);
    t.messages.get.mockResolvedValueOnce(messageRow({ status: 'failed', error_code: 'auto_off' }));
    t.gate.automaticOn.mockResolvedValueOnce(false); // held, switch still OFF: it would be held again
    const held = await t.call({ method: 'POST', url: `/messages/${ID}/retry` });
    expect([held.statusCode, held.json().code]).toEqual([409, 'auto_off']);
    expect(t.sender.kick).not.toHaveBeenCalled();
  });

  it('M2 sent-manually (R-MSG-03): stamps sent_manually_at, no wa.me link any more, audited', async () => {
    t.messages.get.mockResolvedValue(messageRow({ id: ID, status: 'queued' }));
    t.messages.markSentManually.mockResolvedValue(messageRow({ id: ID, status: 'sent_manually', sent_manually_at: '2026-10-02T09:00:00Z' }));
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/sent-manually` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'sent_manually', sent_manually_at: '2026-10-02T09:00:00Z', click_to_chat: null });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'message_sent_manually' }));
  });

  it('M2: 409 not_manual for an inbound row or one already sent', async () => {
    for (const row of [messageRow({ direction: 'inbound', status: 'delivered' }), messageRow({ status: 'sent' })]) {
      t.messages.get.mockResolvedValueOnce(row);
      const res = await t.call({ method: 'POST', url: `/messages/${ID}/sent-manually` });
      expect([res.statusCode, res.json().code]).toEqual([409, 'not_manual']);
    }
    expect(t.messages.markSentManually).not.toHaveBeenCalled();
  });

  it('M3 hand-off: the row is held for the admin (failed «handed_off», wa.me kept), audited', async () => {
    t.messages.get.mockResolvedValue(messageRow({ id: ID, status: 'queued' }));
    t.messages.handOff.mockResolvedValue(messageRow({ id: ID, status: 'failed', error_code: 'handed_off' }));
    const res = await t.call({ method: 'POST', url: `/messages/${ID}/hand-off` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'failed', error_code: 'handed_off', click_to_chat: expect.stringContaining('wa.me') });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'message_handed_off' }));
    t.messages.get.mockResolvedValue(messageRow({ id: ID, status: 'sent' }));
    expect((await t.call({ method: 'POST', url: `/messages/${ID}/hand-off` })).statusCode).toBe(409);
    // claimed by the sender (Meta may be sending it now): neither hand-off nor «sent by hand»
    t.messages.handOff.mockClear();
    t.messages.get.mockResolvedValue(messageRow({ id: ID, status: 'queued', error_code: 'sending' }));
    expect((await t.call({ method: 'POST', url: `/messages/${ID}/hand-off` })).json().code).toBe('not_manual');
    expect((await t.call({ method: 'POST', url: `/messages/${ID}/sent-manually` })).json().code).toBe('not_manual');
    expect(t.messages.handOff).not.toHaveBeenCalled();
  });

  it('G gate: which gate is closed and how many rows wait', async () => {
    t.gate.view.mockResolvedValue({ open: false, reason: 'switch_off', queued: 5 });
    const res = await t.call({ method: 'GET', url: '/messages/gate' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ open: false, reason: 'switch_off', queued: 5 });
  });
});
