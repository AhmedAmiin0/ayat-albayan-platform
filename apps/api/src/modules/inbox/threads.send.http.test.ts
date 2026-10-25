import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender/sender.fakes';
import { REPORT_READY, templateRow } from '../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from './inbox.fakes';
import { ADMIN, inboxApp } from './test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const REQ = 'c0000000-0000-4000-8000-000000000001';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();
const PARAMS = { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' };

describe('H3/H4 sends (docs/12 §4, R-LEAD-02, R-MSG-01)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: FRESH }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', template_key: null, template_params: null }));
    t.queries.get.mockImplementation(async () => messageRow({ id: 'm9', status: 'sent', body: 'أهلًا', template_key: null, template_params: null }));
    t.templates.get.mockResolvedValue(templateRow());
  });

  it('H3 queues the text with the idempotency key, sends now and answers the row after the pass', async () => {
    const res = await t.call({ method: 'POST', url: `${URL}/text`, body: { text: 'أهلًا', clientRequestId: REQ } });
    expect([res.statusCode, res.json().status]).toEqual([201, 'sent']);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      direction: 'outbound', status: 'queued', phone_e164: PHONE, body: 'أهلًا', created_by: ADMIN.id,
      dedup_key: `admin:${PHONE}:${REQ}`, lead_id: 'l0000000-0000-4000-8000-000000000001',
    }));
    expect(t.sender.kick).toHaveBeenCalledTimes(1);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'thread_text', entityId: 'm9' }));
  });

  it('H3 409 session_closed after 24 h, nothing queued', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ last_inbound_at: '2026-01-01T00:00:00Z' }));
    const res = await t.call({ method: 'POST', url: `${URL}/text`, body: { text: 'أهلًا', clientRequestId: REQ } });
    expect([res.statusCode, res.json().code]).toEqual([409, 'session_closed']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('a replayed clientRequestId that already went out is not sent again', async () => {
    t.queries.enqueue.mockResolvedValue(messageRow({ id: 'm9', status: 'sent', template_key: null, body: 'أهلًا' }));
    await t.call({ method: 'POST', url: `${URL}/text`, body: { text: 'أهلًا', clientRequestId: REQ } });
    expect(t.sender.kick).not.toHaveBeenCalled();
  });

  it('H4 queues an approved template with every variable, the lesson and the rendered body', async () => {
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9' }));
    t.queries.get.mockResolvedValue(null);
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'booking_confirmation', params: PARAMS, clientRequestId: REQ } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ template_key: 'booking_confirmation', body: 'تم حجز حلقة ياسمين — الأحد 16:00', status: 'queued' });
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'booking_confirmation', template_params: PARAMS, lesson_id: null }));
  });

  it('H4 409 template_not_approved, 400 missing_params, 400 needs_document', async () => {
    t.templates.get.mockResolvedValueOnce(templateRow({ status: 'pending' }));
    const pending = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'booking_confirmation', params: PARAMS, clientRequestId: REQ } });
    expect([pending.statusCode, pending.json().code]).toEqual([409, 'template_not_approved']);
    const missing = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'booking_confirmation', params: { '1': 'x' }, clientRequestId: REQ } });
    expect([missing.statusCode, missing.json().missing]).toEqual([400, ['2', 'button']]);
    t.templates.get.mockResolvedValueOnce({ ...REPORT_READY, status: 'approved' });
    const doc = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'report_ready', params: PARAMS, clientRequestId: REQ } });
    expect([doc.statusCode, doc.json().code]).toEqual([400, 'needs_document']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H4 refuses lesson_feedback_request: its signed link only comes from «أرسل طلب الرأي»', async () => {
    t.templates.get.mockResolvedValue({ ...templateRow(), key: 'lesson_feedback_request', status: 'approved' });
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'lesson_feedback_request', params: { ...PARAMS, button: 'forged' }, clientRequestId: REQ } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'use_feedback_request']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H4 refuses lesson_rating: «إرسال تقييم الحلقة» picks the lesson, its date and the button payloads', async () => {
    t.templates.get.mockResolvedValue({ ...templateRow(), key: 'lesson_rating', status: 'approved' });
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'lesson_rating', params: PARAMS, clientRequestId: REQ } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'use_rating_button']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H4 refuses lesson_join_link: its one-lesson token only comes from «أرسل رابط الحلقة»', async () => {
    t.templates.get.mockResolvedValue({ ...templateRow(), key: 'lesson_join_link', status: 'approved' });
    const res = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'lesson_join_link', params: { ...PARAMS, button: 'forged' }, clientRequestId: REQ } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'use_join_link']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it('H3/H4 400 missing_client_request_id: no send without its idempotency key (rule 8)', async () => {
    const text = await t.call({ method: 'POST', url: `${URL}/text`, body: { text: 'أهلًا' } });
    expect([text.statusCode, text.json().code]).toEqual([400, 'missing_client_request_id']);
    const tpl = await t.call({ method: 'POST', url: `${URL}/template`, body: { key: 'booking_confirmation', params: PARAMS } });
    expect([tpl.statusCode, tpl.json().code]).toEqual([400, 'missing_client_request_id']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
    expect(t.sender.kick).not.toHaveBeenCalled();
  });
});
