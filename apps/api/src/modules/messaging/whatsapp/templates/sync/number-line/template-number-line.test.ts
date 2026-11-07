import type { TemplateLineSync, WaLine } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import type { NumberRef } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import {
  syncNumber, type NumberSyncDeps,
} from '@/modules/messaging/whatsapp/templates/sync/template-number-sync';

// The number card's sync through its line (owner 2026-11-07): legacy → the line sync «القوالب»
// runs.

const NOW = new Date('2026-11-07T09:00:00Z');
const AT = NOW.toISOString();
const lineSync = (line: WaLine, over: Partial<TemplateLineSync> = {}): TemplateLineSync => ({
  line,
  provider: 'meta',
  configured: true,
  waba_id: null,
  phone_number_id: null,
  ok: true,
  checked_at: AT,
  meta_count: 7,
  synced: 3,
  imported: [],
  skipped: [],
  ...over,
});
const ref = (purpose: NumberRef['purpose']): NumberRef => ({
  id: 'n1',
  purpose,
  is_default: true,
  waba_id: null,
});
const crmNumber = (id: string): OverlayNumber => ({
  id,
  label: id,
  purpose: 'notifications',
  phone_number_id: `p-${id}`,
  waba_id: null,
  enabled: true,
  is_default: true,
  fallback_rank: 100,
  created_at: '2026-10-01T00:00:00Z',
  env: CRM_ENV,
  appSecret: null,
});

const queries = {
  all: vi.fn(async () => []),
  approvals: vi.fn(async () => []),
  upsertApprovals: vi.fn(async () => 0),
  numberRef: vi.fn(async (): Promise<NumberRef | null> => ref('notifications')),
};
const syncLine = vi.fn(async (line: WaLine) => lineSync(line));
let numbers: readonly OverlayNumber[] | null = null;
let active: string | undefined;
const clientOf = vi.fn();
const deps: NumberSyncDeps = {
  queries,
  numbers: () => numbers,
  clientOf,
  log: { warn: vi.fn() },
  syncLine,
  activeNumberId: () => active,
};

describe('syncNumber through the line', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    numbers = null;
    active = undefined;
  });

  it.each(['notifications', 'chat'] as const)(
    'legacy: a %s number runs that line’s sync',
    async (line) => {
      queries.numberRef.mockResolvedValueOnce(ref(line));
      const out = await syncNumber(deps, 'n1', NOW);
      expect(syncLine).toHaveBeenCalledWith(line, NOW);
      expect(out).toEqual({
        number_id: 'n1',
        line,
        ok: true,
        checked_at: AT,
        meta_count: 7,
        synced: 3,
        number_ids: ['n1'],
      });
      expect(clientOf).not.toHaveBeenCalled();
      expect(queries.upsertApprovals).not.toHaveBeenCalled();
    },
  );

  it('legacy: a crm line answers the CRM sync, its failure with its code and scope', async () => {
    syncLine.mockResolvedValueOnce(
      lineSync('notifications', {
        provider: 'crm',
        ok: false,
        error: 'crm_scope_missing',
        message: 'templates:read',
        meta_count: 0,
        synced: 0,
      }),
    );
    const out = await syncNumber(deps, 'n1', NOW);
    expect(out).toMatchObject({
      line: 'notifications',
      ok: false,
      error: 'crm_scope_missing',
      message: 'templates:read',
      number_ids: [],
    });
  });

  it('legacy: a calls number has no templates (no sync); an unknown one 404', async () => {
    queries.numberRef.mockResolvedValueOnce(ref('calls'));
    expect(await syncNumber(deps, 'n1', NOW)).toMatchObject({
      ok: false,
      error: 'calls_no_templates',
      number_ids: [],
    });
    queries.numberRef.mockResolvedValueOnce(null);
    await expect(syncNumber(deps, 'zz', NOW)).rejects.toMatchObject({
      status: 404,
      response: { code: 'unknown_number' },
    });
    expect(syncLine).not.toHaveBeenCalled();
  });

  it('module mode: a crm role number runs its line’s CRM sync; another stays crm_managed', async () => {
    numbers = [crmNumber('n1'), crmNumber('n2')];
    active = 'n1';
    expect(await syncNumber(deps, 'n1', NOW)).toMatchObject({
      number_id: 'n1',
      line: 'notifications',
      ok: true,
    });
    expect(syncLine).toHaveBeenCalledTimes(1);
    expect(await syncNumber(deps, 'n2', NOW)).toMatchObject({
      number_id: 'n2',
      ok: false,
      error: 'crm_managed',
    });
    expect(syncLine).toHaveBeenCalledTimes(1);
    expect(queries.numberRef).not.toHaveBeenCalled();
  });
});
