import { describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '../../../common/integrations/numbers-overlay';
import { approvedOn, routeOf } from './number-route';
import { N1, overlayNum, routePass } from './number-route.fakes';
import { dueMessage } from '../sender/sender.fakes';
import { syncNumber, type NumberSyncDeps } from '../template-number-sync';
import type { ApprovalWrite } from '../templates.queries';
import { templateRow } from '../whatsapp.fakes';
import type { MetaTemplate } from '../whatsapp.types';

// docs/19 «crm driver» in module mode: a crm number's approval is the hand-set message_templates.status.

const CRM_ENV = { provider: 'crm' as const, base: 'http://127.0.0.1:4010/crm/api/v1', apiKey: 'fake-crm-key' };
const crmNumber = overlayNum({ env: CRM_ENV });
const crmPass = (approvals: Record<string, Record<string, string>>) => ({ ...routePass({ numbers: [crmNumber], approvals }), crm: new Set([N1]) });

describe('approvedOn: a crm number', () => {
  it('a stale per-number «approved» from its meta days does not override «missing» set by hand', () => {
    const pass = crmPass({ booking_confirmation: { [N1]: 'approved' } });
    const template = templateRow({ status: 'missing' });
    expect(approvedOn(pass, template)(N1)).toBe(false);
    expect(routeOf(pass, { row: dueMessage(), template })).toBeNull();
  });

  it('a stale per-number «missing» does not block a template marked approved by hand', () => {
    const pass = crmPass({ booking_confirmation: { [N1]: 'missing' } });
    expect(routeOf(pass, { row: dueMessage(), template: templateRow({ status: 'approved' }) })?.numberId).toBe(N1);
  });

  it('a meta number still reads its own row', () => {
    const pass = routePass({ approvals: { booking_confirmation: { [N1]: 'missing' } } });
    expect(approvedOn(pass, templateRow({ status: 'approved' }))(N1)).toBe(false);
  });
});

describe('syncNumber: a crm number on the same waba_id', () => {
  it('gets no approval rows from a meta number\'s sync', async () => {
    const meta = overlayNum({ id: 'meta', waba_id: 'waba-1' });
    const crm = overlayNum({ id: 'crm', waba_id: 'waba-1', env: CRM_ENV });
    const META: MetaTemplate = { id: 'm1', name: 'booking_confirmation', language: 'ar', status: 'APPROVED', category: 'UTILITY', quality: 'GREEN', components: [], rejectedReason: null };
    const upsertApprovals = vi.fn(async (rows: readonly ApprovalWrite[]) => rows.length);
    const deps: NumberSyncDeps = {
      queries: { all: async () => [templateRow()], approvals: async () => [], upsertApprovals },
      numbers: (): readonly OverlayNumber[] => [meta, crm],
      clientOf: () => ({ getTemplates: async () => [META] }),
      log: { warn: vi.fn() },
    };
    vi.stubEnv('WA_TEMPLATE_SYNC', 'true');
    const out = await syncNumber(deps, 'meta', new Date('2026-10-24T09:00:00Z'));
    vi.unstubAllEnvs();
    expect(out.number_ids).toEqual(['meta']);
    expect(upsertApprovals.mock.calls[0]?.[0].every((r) => r.number_id === 'meta')).toBe(true);
  });
});
