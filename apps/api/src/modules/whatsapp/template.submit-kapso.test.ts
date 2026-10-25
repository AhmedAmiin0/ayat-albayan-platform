import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { KAPSO_ENV, kapsoFetch } from './drivers/kapso/kapso.fakes';
import { REPORT_READY_SEED } from './seed-templates.fakes';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { HttpWhatsappClient } from './whatsapp.client';

// docs/19: Kapso has no sample upload, so a document-header submit on a kapso notifications line
// names the real fix (switch the line to meta), not WA_APP_ID, and nothing reaches Kapso.

const queries = { get: vi.fn(), update: vi.fn() };
const audit = { record: vi.fn() };

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('submit of a document-header template on a kapso line', () => {
  it('409 needs_meta_driver (never needs_app_id) and no request at all', async () => {
    vi.stubEnv('WA_PROVIDER', 'kapso');
    vi.stubEnv('WA_APP_ID', 'set-but-useless-on-kapso');
    queries.get.mockResolvedValue(REPORT_READY_SEED);
    const f = kapsoFetch();
    const lines = { notifications: new HttpWhatsappClient(KAPSO_ENV, { fetch: f.fetch }), chat: new HttpWhatsappClient(null) };
    const registry = new TemplateRegistry(queries as unknown as TemplatesQueries, lines, audit as unknown as AuditService);
    const error = await registry.submit('report_ready', 'admin-1').then(
      () => null,
      (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()],
    );
    expect(error).toEqual([409, { code: 'needs_meta_driver', message: 'needs_meta_driver', line: 'notifications' }]);
    expect(f.requests).toHaveLength(0);
    expect(queries.update).not.toHaveBeenCalled();
  });
});
