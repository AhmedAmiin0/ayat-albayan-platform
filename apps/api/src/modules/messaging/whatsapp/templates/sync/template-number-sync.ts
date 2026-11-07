import type { TemplateNumberSyncView, WaProvider } from '@ab/shared';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { WhatsappEnv } from '@/config/env/env';
import { readError, requireSync } from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { wabaSyncPatch } from '@/modules/messaging/whatsapp/templates/names/template-waba-match';
import type { TemplatePatch } from './template-sync';
import {
  EVOLUTION_NO_TEMPLATES, waHttpError,
} from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import {
  syncByLine, syncCrmNumber, unread, type NumberLineDeps,
} from '@/modules/messaging/whatsapp/templates/sync/number-line/template-number-line';
import type { ApprovalRow, ApprovalWrite, TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { WaError, type MetaTemplate, type TemplateRow, type WhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.types';

// One number's template sync (docs/23 phase 5, docs/23c decision 4): read THAT number's WABA list with a
// client built from its own row + Vault secrets (the numbers overlay, module mode) and write the
// approval of every registry key to it and to every other number on the same waba_id (one Meta template
// per WABA). Under legacy the number syncs its line (number-line/). Read-only on Meta;
// never inserts a message_templates row, never sends.

export interface NumberSyncDeps extends NumberLineDeps {
  queries: Pick<TemplatesRepo, 'all' | 'approvals' | 'upsertApprovals' | 'numberRef'>;
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

/** Meta's view when found; a mapped WABA name (template-waba-match.ts) never brings its meta_id. */
function metaOf(p: TemplatePatch, prev: ApprovalRow | undefined): Meta {
  if (p.quality === undefined) return kept(prev);
  const meta_id = p.meta_id ?? prev?.meta_id ?? null;
  return { meta_id, quality: p.quality, last_error: p.last_error ?? null };
}

/** One key on one number: Meta's view, or (absent) not_submitted stays not_submitted and anything else is missing. */
function approval(input: { row: TemplateRow; prev: ApprovalRow | undefined; meta: readonly MetaTemplate[] }, numberId: string, now: Date): ApprovalWrite {
  const { row, prev } = input;
  const p = wabaSyncPatch({ ...row, status: prev?.status ?? 'not_submitted' }, input.meta, now);
  const meta = metaOf(p, prev);
  return { template_key: row.key, number_id: numberId, status: p.status ?? 'not_submitted', ...meta, last_checked_at: now.toISOString() };
}

type Elsewhere = (
  deps: NumberSyncDeps, n: OverlayNumber, now: Date,
) => Promise<TemplateNumberSyncView>;
const noList = (n: OverlayNumber, now: Date): TemplateNumberSyncView =>
  ({ ...unread(n.id, now), ok: false, error: EVOLUTION_NO_TEMPLATES });

/** No WABA list of the number's own: the CRM's line sync; Evolution none (no call). */
const NOT_A_WABA_LIST: Partial<Record<WaProvider, Elsewhere>> = {
  crm: syncCrmNumber,
  evolution: (_deps, n, now) => Promise.resolve(noList(n, now)),
};

/**
 * POST /admin/numbers/:id/templates/sync. 409 template_sync_off, 404 unknown_number. Under
 * legacy the number's role syncs its line (syncByLine). A number that cannot send (disabled,
 * no token) answers not_configured without a Meta call, an Evolution number
 * evolution_no_templates, a crm number its line's CRM sync (syncCrmNumber); a failed read is
 * that number's error (200).
 */
export async function syncNumber(deps: NumberSyncDeps, numberId: string, now: Date): Promise<TemplateNumberSyncView> {
  requireSync();
  const all = deps.numbers();
  if (all === null) return syncByLine(deps, numberId, now);
  const n = all.find((x) => x.id === numberId);
  if (!n) throw waHttpError('unknown_number', 404);
  const base = unread(n.id, now);
  if (!n.env) return { ...base, ok: false, error: 'not_configured' };
  const elsewhere = NOT_A_WABA_LIST[n.env.provider ?? 'meta'];
  if (elsewhere) return elsewhere(deps, n, now);
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
