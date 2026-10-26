import type { TemplateNumberSyncView } from '@ab/shared';
import type { OverlayNumber } from '../../../../../common/integrations/numbers-overlay';
import type { WhatsappEnv } from '../../../../../config/env/env';
import { readError, requireSync } from '../catalog/template-env';
import { findMeta, syncPatch } from './template-sync';
import { CRM_MANAGED, waHttpError } from '../catalog/template.mapper';
import type { ApprovalRow, ApprovalWrite, TemplatesQueries } from '../catalog/templates.queries';
import { WaError, type MetaTemplate, type TemplateRow, type WhatsappClient } from '../../whatsapp.types';

// One number's template sync (docs/23 phase 5, docs/23c decision 4): read THAT number's WABA list with a
// client built from its own row + Vault secrets (the numbers overlay, module mode only) and write the
// approval of every registry key to it and to every other number on the same waba_id (one Meta template
// per WABA). Read-only on Meta; never inserts a message_templates row, never sends.

export interface NumberSyncDeps {
  queries: Pick<TemplatesQueries, 'all' | 'approvals' | 'upsertApprovals'>;
  /** overlayNumbers(): null under legacy. */
  numbers: () => readonly OverlayNumber[] | null;
  clientOf: (env: WhatsappEnv) => Pick<WhatsappClient, 'getTemplates'>;
  log: { warn: (message: string) => void };
}

async function readList(deps: NumberSyncDeps, n: OverlayNumber & { env: WhatsappEnv }): Promise<MetaTemplate[] | { error: string; message?: string }> {
  try {
    return await deps.clientOf(n.env).getTemplates();
  } catch (e) {
    if (!(e instanceof WaError)) throw e;
    deps.log.warn(`number ${n.id} templates not read: ${e.message}`);
    return readError(e);
  }
}

type Meta = Pick<ApprovalWrite, 'meta_id' | 'quality' | 'last_error'>;
const kept = (prev: ApprovalRow | undefined): Meta => ({ meta_id: prev?.meta_id ?? null, quality: prev?.quality ?? null, last_error: prev?.last_error ?? null });

/** One key on one number: Meta's view, or (absent) not_submitted stays not_submitted and anything else is missing. */
function approval(input: { row: TemplateRow; prev: ApprovalRow | undefined; meta: readonly MetaTemplate[] }, numberId: string, now: Date): ApprovalWrite {
  const { row, prev } = input;
  const p = syncPatch({ ...row, status: prev?.status ?? 'not_submitted' }, findMeta(row, input.meta), now);
  const meta: Meta = p.meta_id === undefined ? kept(prev) : { meta_id: p.meta_id, quality: p.quality ?? null, last_error: p.last_error ?? null };
  return { template_key: row.key, number_id: numberId, status: p.status ?? 'not_submitted', ...meta, last_checked_at: now.toISOString() };
}

/**
 * POST /admin/numbers/:id/templates/sync. 409 template_sync_off, 409 module_mode_only (legacy: numbers
 * have no client of their own), 404 unknown_number. A number that cannot send (disabled, no token)
 * answers not_configured without a Meta call, a crm number crm_managed; a failed read is that number's error (200).
 */
export async function syncNumber(deps: NumberSyncDeps, numberId: string, now: Date): Promise<TemplateNumberSyncView> {
  requireSync();
  const all = deps.numbers();
  if (all === null) throw waHttpError('module_mode_only', 409);
  const n = all.find((x) => x.id === numberId);
  if (!n) throw waHttpError('unknown_number', 404);
  const base = { number_id: n.id, checked_at: now.toISOString(), meta_count: 0, synced: 0, number_ids: [] };
  if (!n.env) return { ...base, ok: false, error: 'not_configured' };
  // A crm number's templates live in the CRM (docs/19): no call, no approval written.
  if (n.env.provider === 'crm') return { ...base, ok: false, error: CRM_MANAGED };
  const list = await readList(deps, { ...n, env: n.env });
  if (!Array.isArray(list)) return { ...base, ok: false, ...list };
  // A crm number on the same waba_id keeps its hand-set status (docs/19): Meta's view is never written to it.
  const sameWaba = (x: OverlayNumber) => x.waba_id === n.waba_id && x.env?.provider !== 'crm';
  const targets = n.waba_id ? all.filter(sameWaba).map((x) => x.id) : [n.id];
  const [rows, prev] = await Promise.all([deps.queries.all(), deps.queries.approvals()]);
  const writes = targets.flatMap((id) =>
    rows.map((row) => approval({ row, prev: prev.find((a) => a.template_key === row.key && a.number_id === id), meta: list }, id, now)),
  );
  await deps.queries.upsertApprovals(writes);
  return { ...base, ok: true, meta_count: list.length, synced: rows.length, number_ids: targets };
}
