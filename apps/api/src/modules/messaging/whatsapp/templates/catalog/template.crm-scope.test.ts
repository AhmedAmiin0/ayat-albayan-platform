import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { crmErrorFrom } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import { CRM_ENV, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { templateServices } from '@/modules/messaging/whatsapp/templates/sync/template-services.fakes';
import { scriptedFetch, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { graphHttpError } from './template.mapper';
import { readError } from './template-env';

// docs/39: a CRM key without templates:read / templates:write. The CRM answers 403 naming the
// scope; «مزامنة» and «إرسال إلى ميتا» say which one (crm_scope_missing), and no row is touched.

const queries = {
  all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []),
  upsertApprovals: vi.fn(),
  saveLineSync: vi.fn(async () => undefined),
  lineSyncs: vi.fn(async () => new Map()),
};
const audit = { record: vi.fn() };
const NOW = new Date('2026-11-07T08:00:00Z');
const missing = (scope: string) => scriptedFetch(crmFailure(403, 'forbidden', `API key is missing the '${scope}' scope`));
const services = (g: ReturnType<typeof scriptedFetch>) => templateServices(
  queries,
  {
    notifications: new CrmWhatsappClient(CRM_ENV, { fetch: g.fetch }),
    chat: new CrmWhatsappClient(null),
  },
  audit,
);
const answer = (status: number, message: string) =>
  ({ status, text: JSON.stringify(crmFailure(status, 'forbidden', message).body), retryAfter: null });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('WA_PROVIDER', 'crm');
  queries.all.mockResolvedValue([templateRow({ status: 'approved' })]);
});
afterEach(() => vi.unstubAllEnvs());

describe('a CRM key without a templates scope', () => {
  it('the 403 keeps the scope it names and stays a credential hold', () => {
    const e = crmErrorFrom(answer(403, "missing the 'templates:read' scope"));
    expect(e.info).toMatchObject({ credential: 'crm', missingScope: 'templates:read', status: 403 });
    expect(graphHttpError(e).getResponse()).toEqual({ code: 'crm_scope_missing', message: 'crm_scope_missing', scope: 'templates:read' });
    expect(readError(e)).toEqual({ error: 'crm_scope_missing', message: 'templates:read' });
  });

  it('a 403 naming no scope, and a 401, stay crm_auth', () => {
    expect(crmErrorFrom(answer(403, 'forbidden')).info.missingScope).toBeUndefined();
    expect(crmErrorFrom(answer(401, "missing the 'templates:read' scope")).info.missingScope).toBeUndefined();
    expect(readError(crmErrorFrom(answer(403, 'forbidden')))).toEqual({ error: 'crm_auth' });
  });

  it('«مزامنة»: the line reads crm_scope_missing with the scope, and no row is touched', async () => {
    const health = await services(missing('templates:read')).verifier.verifyAll({ line: 'notifications', now: NOW });
    expect(health.lines).toEqual([
      expect.objectContaining({ ok: false, error: 'crm_scope_missing', message: 'templates:read', meta_count: 0 }),
    ]);
    expect(queries.update).not.toHaveBeenCalled();
  });

  it('«إرسال إلى ميتا»: 502 crm_scope_missing naming templates:write; the row stays not_submitted', async () => {
    queries.get.mockResolvedValue(templateRow({ status: 'not_submitted', body_ar: 'حلقة {{1}} يوم {{2}}.' }));
    const g = missing('templates:write');
    const failed = await services(g).admin.submit('booking_confirmation', 'admin-1').catch((e: unknown) => e);
    const http = failed as { getStatus: () => number; getResponse: () => unknown };
    expect([http.getStatus(), http.getResponse()]).toEqual([
      502,
      { code: 'crm_scope_missing', message: 'crm_scope_missing', scope: 'templates:write' },
    ]);
    expect(g.requests).toHaveLength(1);
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
