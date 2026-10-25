import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../common/audit/audit.service';
import type { OverlayNumber } from '../../../../common/integrations/numbers-overlay';
import { CrmWhatsappClient } from '../../drivers/crm/crm.client';
import { CRM_ENV, CRM_SENT } from '../../drivers/crm/crm.fakes';
import { syncNumber } from '../sync/template-number-sync';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { scriptedFetch, templateRow } from '../../whatsapp.fakes';

// docs/19 «crm driver»: a crm line's templates live in the CRM. No sync call, no row touched, no submit;
// the admin sets the status by hand (audited), only while the line is on crm.

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []), upsertApprovals: vi.fn() };
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-25T08:00:00Z');
const f = scriptedFetch(CRM_SENT);
const lines = { notifications: new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch }), chat: new CrmWhatsappClient(null) };
const registry = () => new TemplateRegistry(queries as unknown as TemplatesQueries, lines, audit as unknown as AuditService);
const crmStatus = () => ({ set: (input: Parameters<TemplateRegistry['setCrmStatus']>[0], actor: string) => registry().setCrmStatus(input, actor) });
const rejected = (p: Promise<unknown>) =>
  p.then(() => null, (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()]);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('WA_PROVIDER', 'crm');
  queries.all.mockResolvedValue([templateRow({ status: 'approved' }), templateRow({ key: 'gone', status: 'missing' })]);
  queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
});
afterEach(() => vi.unstubAllEnvs());

describe('templates on a crm line', () => {
  it('the sync answers crm_managed, calls nothing and never touches a row (no missing / not_submitted)', async () => {
    const health = await registry().verifyAll({ line: 'notifications', now: NOW });
    expect(health.lines).toEqual([expect.objectContaining({ line: 'notifications', provider: 'crm', ok: false, error: 'crm_managed', meta_count: 0 })]);
    expect(queries.update).not.toHaveBeenCalled();
    expect(queries.insert).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
    const [view] = await registry().lineViews();
    expect(view).toMatchObject({ provider: 'crm', waba_id: null, phone_number_id: null });
  });

  it('submit is 409 crm_managed naming the line, before any call', async () => {
    queries.get.mockResolvedValue(templateRow({ status: 'not_submitted' }));
    expect(await rejected(registry().submit('booking_confirmation', 'admin-1'))).toEqual([
      409,
      { code: 'crm_managed', message: 'crm_managed', line: 'notifications' },
    ]);
    expect(queries.update).not.toHaveBeenCalled();
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
    const res = await syncNumber({ queries: queries as unknown as TemplatesQueries, numbers: () => [n], clientOf, log: { warn: vi.fn() } }, 'n1', NOW);
    expect(res).toMatchObject({ ok: false, error: 'crm_managed', number_id: 'n1' });
    expect(clientOf).not.toHaveBeenCalled();
    expect(queries.upsertApprovals).not.toHaveBeenCalled();
  });
});
