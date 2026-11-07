import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { EvolutionLineEnv, MetaLineEnv } from '@/config/env/env';
import { syncNumber, type NumberSyncDeps } from './template-number-sync';
import type { ApprovalRow, ApprovalWrite } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { REMINDER_24H, REPORT_READY, STUB_ENV, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError, type MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';

// POST /admin/numbers/:id/templates/sync (docs/23c decision 4): one number's WABA list → every number on that WABA.

const NOW = new Date('2026-10-24T09:00:00Z');
const env: MetaLineEnv = { ...STUB_ENV, wabaId: 'waba-1' };
const number = (id: string, over: Partial<OverlayNumber> = {}): OverlayNumber => ({
  id, label: id, purpose: 'notifications', phone_number_id: `p-${id}`, waba_id: 'waba-1', enabled: true, is_default: false,
  fallback_rank: 100, created_at: '2026-10-01T00:00:00Z', env, appSecret: null, ...over,
});
const EVO: EvolutionLineEnv = {
  provider: 'evolution', base: 'http://evo', instance: 'i', token: 't', mode: 'baileys',
  autoSends: false, gapMs: 0, dailyCap: 1, linkPreview: false,
};
const A = number('a'), B = number('b', { env: null, enabled: false }), C = number('c', { waba_id: 'waba-2' });
const META: MetaTemplate = { id: 'm1', name: 'booking_confirmation', language: 'ar', status: 'APPROVED', category: 'UTILITY', quality: 'GREEN', components: [], rejectedReason: null };

const getTemplates = vi.fn(async (): Promise<MetaTemplate[]> => [META]);
const queries = {
  all: vi.fn(async () => [templateRow(), REPORT_READY, REMINDER_24H]),
  approvals: vi.fn(async (): Promise<ApprovalRow[]> => []),
  upsertApprovals: vi.fn(async (rows: readonly ApprovalWrite[]) => rows.length),
  numberRef: vi.fn(async () => null),
};
const syncLine = vi.fn();
let numbers: readonly OverlayNumber[] | null;
const clientOf = vi.fn(() => ({ getTemplates }));
const deps: NumberSyncDeps = {
  queries, numbers: () => numbers, clientOf, log: { warn: vi.fn() }, syncLine,
  activeNumberId: () => undefined,
};
const written = (): ApprovalWrite[] => queries.upsertApprovals.mock.calls[0]?.[0] as ApprovalWrite[];

describe('syncNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    numbers = [A, B, C];
  });
  afterEach(() => vi.unstubAllEnvs());

  it('writes every key to the number and to each number sharing its WABA, from its own client', async () => {
    queries.approvals.mockResolvedValueOnce([
      { template_key: 'report_ready', number_id: 'b', status: 'approved', meta_id: 'old', quality: 'GREEN', last_error: null, last_checked_at: null, updated_at: '' },
    ]);
    const out = await syncNumber(deps, 'a', NOW);
    expect(clientOf).toHaveBeenCalledWith(env);
    expect(out).toEqual({ number_id: 'a', ok: true, checked_at: NOW.toISOString(), meta_count: 1, synced: 3, number_ids: ['a', 'b'] });
    const rows = written();
    expect(rows).toHaveLength(6);
    expect(rows.find((r) => r.number_id === 'b' && r.template_key === 'booking_confirmation')).toMatchObject({ status: 'approved', meta_id: 'm1', quality: 'GREEN' });
    expect(rows.find((r) => r.number_id === 'b' && r.template_key === 'report_ready')).toMatchObject({ status: 'missing', meta_id: 'old' });
    expect(rows.find((r) => r.number_id === 'a' && r.template_key === 'report_ready')).toMatchObject({ status: 'not_submitted', meta_id: null });
    expect(rows.some((r) => r.number_id === 'c')).toBe(false);
  });

  it('a number that cannot send answers not_configured without a Meta call or a write', async () => {
    const out = await syncNumber(deps, 'b', NOW);
    expect(out).toMatchObject({ number_id: 'b', ok: false, error: 'not_configured', meta_count: 0, number_ids: [] });
    expect(clientOf).not.toHaveBeenCalled();
    expect(queries.upsertApprovals).not.toHaveBeenCalled();
  });

  it('a failed read is the number’s error (no write)', async () => {
    getTemplates.mockRejectedValueOnce(new WaError('bad token', { status: 401, code: 190 }));
    const out = await syncNumber(deps, 'c', NOW);
    expect(out).toMatchObject({ ok: false, error: 'meta_error' });
    expect(queries.upsertApprovals).not.toHaveBeenCalled();
  });

  it('an Evolution number answers evolution_no_templates without a call', async () => {
    numbers = [number('e', { env: EVO })];
    const out = await syncNumber(deps, 'e', NOW);
    expect(out).toMatchObject({ ok: false, error: 'evolution_no_templates' });
    expect(clientOf).not.toHaveBeenCalled();
  });

  it('legacy (no overlay) runs the line sync, never 409 module_mode_only', async () => {
    numbers = null;
    const unknown = { status: 404, response: { code: 'unknown_number' } };
    await expect(syncNumber(deps, 'a', NOW)).rejects.toMatchObject(unknown);
    expect(queries.numberRef).toHaveBeenCalledWith('a');
    expect(clientOf).not.toHaveBeenCalled();
  });

  it('unknown 404; WA_TEMPLATE_SYNC=false 409', async () => {
    numbers = [A];
    await expect(syncNumber(deps, 'zz', NOW)).rejects.toMatchObject({ status: 404, response: { code: 'unknown_number' } });
    vi.stubEnv('WA_TEMPLATE_SYNC', 'false');
    await expect(syncNumber(deps, 'a', NOW)).rejects.toMatchObject({ status: 409, response: { code: 'template_sync_off' } });
    expect(clientOf).not.toHaveBeenCalled();
  });
});
