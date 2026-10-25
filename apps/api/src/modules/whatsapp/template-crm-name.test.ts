import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV } from './crm.fakes';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { templateRow } from './whatsapp.fakes';

// docs/19 «crm driver»: the CRM name / language of a template, by hand, audited, only on a crm line.

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []), upsertApprovals: vi.fn() };
const audit = { record: vi.fn() };
const lines = { notifications: new CrmWhatsappClient(CRM_ENV), chat: new CrmWhatsappClient(null) };
const registry = () => new TemplateRegistry(queries as unknown as TemplatesQueries, lines, audit as unknown as AuditService);
const rejected = (p: Promise<unknown>) => p.then(() => null, (e: { getStatus: () => number; getResponse: () => unknown }) => [e.getStatus(), e.getResponse()]);

beforeEach(() => {
  vi.resetAllMocks();
  queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
});
afterEach(() => vi.unstubAllEnvs());

describe('setCrmName', () => {
  it('on a crm line: saved, audited template_crm_name_set with before / after', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    queries.get.mockResolvedValue(templateRow({ key: 'report_ready' }));
    const view = await registry().setCrmName({ key: 'report_ready', crm_name: 'report_session', crm_language: null }, 'admin-1');
    expect(view).toMatchObject({ key: 'report_ready', crm_name: 'report_session', crm_language: null });
    expect(queries.update).toHaveBeenCalledWith('report_ready', { crm_name: 'report_session', crm_language: null });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'template_crm_name_set',
      before: expect.objectContaining({ crm_name: null }),
      after: expect.objectContaining({ crm_name: 'report_session', line: 'notifications' }),
    }));
  });

  it('409 not_crm_line on a meta line; 404 for an unknown key; nothing written', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    queries.get.mockResolvedValue(templateRow());
    expect(await rejected(registry().setCrmName({ key: 'booking_confirmation', crm_name: 'x', crm_language: null }, 'a'))).toEqual([
      409, expect.objectContaining({ code: 'not_crm_line' }),
    ]);
    queries.get.mockResolvedValue(null);
    expect(await rejected(registry().setCrmName({ key: 'nope', crm_name: null, crm_language: null }, 'a'))).toEqual([
      404, expect.objectContaining({ code: 'template_not_found' }),
    ]);
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('back to the default works on a meta line too (a name left from its crm days), audited', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    queries.get.mockResolvedValue(templateRow({ key: 'teacher_new_student', crm_name: 'teacher_alert_x' }));
    await registry().setCrmName({ key: 'teacher_new_student', crm_name: null, crm_language: null }, 'admin-1');
    expect(queries.update).toHaveBeenCalledWith('teacher_new_student', { crm_name: null, crm_language: null });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ before: expect.objectContaining({ crm_name: 'teacher_alert_x' }) }));
  });
});
