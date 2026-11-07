import { describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { approvedOn, routeOf, sendableSomewhere } from './number-route';
import { N1, overlayNum, routePass } from './number-route.fakes';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { syncNumber, type NumberSyncDeps } from '@/modules/messaging/whatsapp/templates/sync/template-number-sync';
import type { ApprovalWrite } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';

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
      queries: {
        all: async () => [templateRow()], approvals: async () => [], upsertApprovals,
        numberRef: async () => null,
      },
      numbers: (): readonly OverlayNumber[] => [meta, crm],
      clientOf: () => ({ getTemplates: async () => [META] }),
      log: { warn: vi.fn() },
      syncLine: vi.fn(),
      activeNumberId: () => undefined,
    };
    vi.stubEnv('WA_TEMPLATE_SYNC', 'true');
    const out = await syncNumber(deps, 'meta', new Date('2026-10-24T09:00:00Z'));
    vi.unstubAllEnvs();
    expect(out.number_ids).toEqual(['meta']);
    expect(upsertApprovals.mock.calls[0]?.[0].every((r) => r.number_id === 'meta')).toBe(true);
  });
});

describe('approvedOn: a crm number and the crm gate (teacher_new_student → teacher_lesson_v2)', () => {
  const own = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', status: 'not_submitted' });

  it('the gate\'s keys decide on a crm number; a meta number still reads its own row', () => {
    const pass = { ...crmPass({}), crmApproved: new Set(['teacher_new_student']) };
    expect(approvedOn(pass, own)(N1)).toBe(true);
    expect(approvedOn({ ...routePass({}), crmApproved: pass.crmApproved }, own)(N1)).toBe(false);
  });

  it('sendableSomewhere: a gated row nothing approves is dropped', () => {
    expect(sendableSomewhere({ approvals: new Map(), crmApproved: new Set() }, own)).toBe(false);
    expect(sendableSomewhere({ approvals: new Map(), crmApproved: new Set(['teacher_new_student']) }, own)).toBe(true);
    const onNumber = new Map([['teacher_new_student', new Map([[N1, 'approved']])]]);
    expect(sendableSomewhere({ approvals: onNumber }, own)).toBe(true);
  });
});
