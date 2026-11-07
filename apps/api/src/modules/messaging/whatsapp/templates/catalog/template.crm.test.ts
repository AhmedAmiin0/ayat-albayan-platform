import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { CRM_ENV, CRM_SENT, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { syncNumber } from '@/modules/messaging/whatsapp/templates/sync/template-number-sync';
import { templateServices } from '@/modules/messaging/whatsapp/templates/sync/template-services.fakes';
import type { TemplateAdmin } from './template-admin';
import { scriptedFetch, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// docs/19 «crm driver», docs/39: a crm line's templates live in the CRM. Its sync reads their
// status from the CRM (nothing imported, nothing marked missing), its submit goes through the
// CRM; the admin can still set the status by hand (audited), only while the line is on crm.

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []), upsertApprovals: vi.fn(), saveLineSync: vi.fn(async () => undefined), lineSyncs: vi.fn(async () => new Map()) };
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-25T08:00:00Z');
const f = scriptedFetch(CRM_SENT);
const lines = { notifications: new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch }), chat: new CrmWhatsappClient(null) };
const registry = () => templateServices(queries, lines, audit);
const onCrm = (g: ReturnType<typeof scriptedFetch>) => new CrmWhatsappClient(CRM_ENV, { fetch: g.fetch });
const services = (g: ReturnType<typeof scriptedFetch>) =>
  templateServices(queries, { ...lines, notifications: onCrm(g) }, audit);
const crmStatus = () => ({ set: (input: Parameters<TemplateAdmin['setCrmStatus']>[0], actor: string) => registry().admin.setCrmStatus(input, actor) });
const rejected = (p: Promise<unknown>) =>
  p.then(() => null, (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()]);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('WA_PROVIDER', 'crm');
  queries.all.mockResolvedValue([templateRow({ status: 'approved' }), templateRow({ key: 'gone', meta_name: 'gone', status: 'missing' })]);
  queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
});
afterEach(() => vi.unstubAllEnvs());

describe('templates on a crm line', () => {
  it('the sync reads status only from the CRM: no import, an absent row is never marked missing', async () => {
    const listed = { name: 'booking_confirmation', language: 'ar', status: 'REJECTED', category: 'UTILITY', meta_template_id: 'mt-1', quality_score: 'RED', rejection_reason: 'bad', extra: 1 };
    const other = { ...listed, name: 'crm_only' };
    const g = scriptedFetch({ status: 200, body: { data: [listed, other] } });
    const health = await services(g).verifier.verifyAll({ line: 'notifications', now: NOW });
    expect(health.lines).toEqual([expect.objectContaining({ provider: 'crm', ok: true, meta_count: 2, imported: [], skipped: [] })]);
    expect(g.requests[0]?.url).toBe(`${CRM_ENV.base}/templates?sync=1&limit=100`);
    expect(queries.update).toHaveBeenCalledWith('booking_confirmation', {
      last_checked_at: NOW.toISOString(), status: 'rejected', quality: 'RED', last_error: 'bad', meta_id: 'mt-1',
    });
    expect(queries.update).toHaveBeenCalledWith('gone', { last_checked_at: NOW.toISOString() });
    expect(queries.insert).not.toHaveBeenCalled();
  });

  it('an older CRM (404) answers crm_managed and touches no row; a 403 naming no scope is crm_auth', async () => {
    const old = await services(scriptedFetch(crmFailure(404, 'not_found'))).verifier.verifyAll({ line: 'notifications', now: NOW });
    expect(old.lines).toEqual([expect.objectContaining({ provider: 'crm', ok: false, error: 'crm_managed', meta_count: 0 })]);
    const scope = await services(scriptedFetch(crmFailure(403, 'forbidden'))).verifier.verifyAll({ line: 'notifications', now: NOW });
    expect(scope.lines).toEqual([expect.objectContaining({ ok: false, error: 'crm_auth' })]);
    expect(queries.update).not.toHaveBeenCalled();
    const [view] = await registry().catalog.lineViews();
    expect(view).toMatchObject({ provider: 'crm', waba_id: null, phone_number_id: null });
  });

  it('a document header is 409 crm_managed naming the line, before any call', async () => {
    queries.get.mockResolvedValue(templateRow({ status: 'not_submitted', header_format: 'document' }));
    expect(await rejected(registry().admin.submit('booking_confirmation', 'admin-1'))).toEqual([
      409,
      { code: 'crm_managed', message: 'crm_managed', line: 'notifications' },
    ]);
    expect(queries.update).not.toHaveBeenCalled();
  });

  it('any other submit goes through the CRM and is saved pending', async () => {
    queries.get.mockResolvedValue(templateRow({ status: 'not_submitted', body_ar: 'حلقة {{1}} يوم {{2}}.' }));
    const g = scriptedFetch({ status: 201, body: { data: { meta_template_id: 'mt-9', status: 'PENDING' } } });
    const view = await services(g).admin.submit('booking_confirmation', 'admin-1');
    expect(view.status).toBe('pending');
    expect(g.requests[0]).toMatchObject({ url: `${CRM_ENV.base}/templates`, body: { name: 'booking_confirmation' } });
    expect(queries.update).toHaveBeenCalledWith('booking_confirmation', expect.objectContaining({ status: 'pending', meta_id: 'mt-9' }));
  });

  it('the admin sets approved / missing by hand, audited', async () => {
    queries.get.mockResolvedValue(templateRow({ status: 'missing' }));
    const view = await crmStatus().set({ key: 'booking_confirmation', status: 'approved' }, 'admin-1');
    expect(view.status).toBe('approved');
    expect(queries.update).toHaveBeenCalledWith('booking_confirmation', expect.objectContaining({ status: 'approved', last_error: null }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'template_crm_status_set',
      before: { key: 'booking_confirmation', status: 'missing', line: 'notifications' },
      after: { key: 'booking_confirmation', status: 'approved', line: 'notifications' },
    }));
  });

  it('not on a crm line: 409 not_crm_line and nothing written; unknown key: 404', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    queries.get.mockResolvedValue(templateRow());
    expect(await rejected(crmStatus().set({ key: 'booking_confirmation', status: 'missing' }, 'a'))).toEqual([
      409,
      { code: 'not_crm_line', message: 'not_crm_line', line: 'notifications' },
    ]);
    queries.get.mockResolvedValue(null);
    expect((await rejected(crmStatus().set({ key: 'x', status: 'missing' }, 'a')))?.[0]).toBe(404);
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('a crm number in module mode: its sync answers crm_managed and writes no approval', async () => {
    const n = { id: 'n1', waba_id: null, env: CRM_ENV } as unknown as OverlayNumber;
    const clientOf = vi.fn();
    const res = await syncNumber({ queries: queries, numbers: () => [n], clientOf, log: { warn: vi.fn() } }, 'n1', NOW);
    expect(res).toMatchObject({ ok: false, error: 'crm_managed', number_id: 'n1' });
    expect(clientOf).not.toHaveBeenCalled();
    expect(queries.upsertApprovals).not.toHaveBeenCalled();
  });
});
