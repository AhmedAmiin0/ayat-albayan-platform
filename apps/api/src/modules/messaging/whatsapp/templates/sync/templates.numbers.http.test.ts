import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '../../../../../common/integrations/numbers-overlay';
import { ADMIN, whatsappApp } from '../../test-app';
import type { ApprovalRow } from '../catalog/templates.queries';
import { templateRow } from '../../whatsapp.fakes';

// Templates per number over HTTP (docs/23c decision 9): numbers[] on the list, PUT …/:key/number and
// POST /admin/numbers/:id/templates/sync (templates.manage; never sales or a teacher).

type App = Awaited<ReturnType<typeof whatsappApp>>;
const NUM = 'b0000000-0000-4000-8000-000000000001';
const URL_NUMBER = '/messaging/templates/booking_confirmation/number';
const URL_SYNC = `/admin/numbers/${NUM}/templates/sync`;
const row = templateRow();
const approval: ApprovalRow = { template_key: 'booking_confirmation', number_id: NUM, status: 'approved', meta_id: 'm1', quality: 'GREEN', last_error: null, last_checked_at: '2026-10-24T08:00:00Z', updated_at: '' };
const unsendable: OverlayNumber = {
  id: NUM, label: 'رقم احتياطي', purpose: 'chat', phone_number_id: 'p1', waba_id: 'w1', enabled: false, is_default: false,
  fallback_rank: 100, created_at: '2026-10-01T00:00:00Z', env: null, appSecret: null,
};

describe('templates per number (HTTP)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.templates.all.mockResolvedValue([row]);
    t.templates.get.mockResolvedValue(row);
    t.templates.update.mockImplementation(async (_key: string, patch: object) => ({ ...row, ...patch }));
  });
  afterEach(() => setNumbersOverlay(null));

  it('GET /messaging/templates: each item carries number_id and its numbers[]', async () => {
    t.templates.approvals.mockResolvedValue([approval]);
    const res = await t.call({ method: 'GET', url: '/messaging/templates' });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0]).toMatchObject({
      key: 'booking_confirmation', number_id: null,
      numbers: [{ number_id: NUM, status: 'approved', last_checked_at: '2026-10-24T08:00:00Z', last_error: null }],
    });
  });

  it('PUT number: 200, saved and audited; approved on it → no warning', async () => {
    t.templates.numberRef.mockResolvedValue({ id: NUM, purpose: 'chat', is_default: false, waba_id: 'w1' });
    t.templates.approvals.mockResolvedValue([approval]);
    const res = await t.call({ method: 'PUT', url: URL_NUMBER, body: { number_id: NUM } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ template: { key: 'booking_confirmation', number_id: NUM }, not_approved_on_number: false });
    expect(t.templates.update).toHaveBeenCalledWith('booking_confirmation', { number_id: NUM });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN.id, action: 'template_number_set' }));
  });

  it('PUT number: 404 unknown_number, 404 template_not_found, 400 bad body; nothing saved', async () => {
    t.templates.numberRef.mockResolvedValue(null);
    const unknown = await t.call({ method: 'PUT', url: URL_NUMBER, body: { number_id: NUM } });
    expect([unknown.statusCode, unknown.json().code]).toEqual([404, 'unknown_number']);
    t.templates.get.mockResolvedValue(null);
    const missing = await t.call({ method: 'PUT', url: '/messaging/templates/nope/number', body: { number_id: null } });
    expect([missing.statusCode, missing.json().code]).toEqual([404, 'template_not_found']);
    expect((await t.call({ method: 'PUT', url: URL_NUMBER, body: { number_id: 'chat' } })).statusCode).toBe(400);
    expect(t.templates.update).not.toHaveBeenCalled();
  });

  it('sales and teachers may set no number and run no sync (403)', async () => {
    for (const token of ['sales', 'teacher']) {
      expect((await t.call({ method: 'PUT', url: URL_NUMBER, token, body: { number_id: null } })).statusCode).toBe(403);
      expect((await t.call({ method: 'POST', url: URL_SYNC, token })).statusCode).toBe(403);
    }
    expect(t.templates.update).not.toHaveBeenCalled();
    expect(t.templates.upsertApprovals).not.toHaveBeenCalled();
  });

  it('sync: legacy 409 module_mode_only; a number that cannot send → ok:false not_configured, no Meta call', async () => {
    const legacy = await t.call({ method: 'POST', url: URL_SYNC });
    expect([legacy.statusCode, legacy.json().code]).toEqual([409, 'module_mode_only']);
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [unsendable] });
    const res = await t.call({ method: 'POST', url: URL_SYNC });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ number_id: NUM, ok: false, error: 'not_configured', meta_count: 0, synced: 0 });
    expect(t.client.getTemplates).not.toHaveBeenCalled();
    expect(t.chatClient.getTemplates).not.toHaveBeenCalled();
    expect(t.templates.upsertApprovals).not.toHaveBeenCalled();
    expect((await t.call({ method: 'POST', url: '/admin/numbers/not-a-uuid/templates/sync' })).statusCode).toBe(400);
  });
});
