import {
  isWaLine,
  type TemplateLineSync,
  type TemplateNumberSyncView,
  type WaLine,
} from '@ab/shared';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import {
  CRM_MANAGED,
  waHttpError,
} from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';

// The number card's sync through its line (owner 2026-11-07): under legacy a number has no client
// of
// its own, so «مزامنة القوالب مع هذا الرقم» runs exactly the sync «القوالب» runs for the number's
// role
// (template-line-sync.ts: the Meta / Kapso list, or the CRM's). Read-only, never sends.

/**
 * A calls-only number (docs/28 §10) has no line and no templates: nothing read, nothing written.
 */
const CALLS_NO_TEMPLATES = 'calls_no_templates';

export interface NumberLineDeps {
  queries: Pick<TemplatesRepo, 'numberRef'>;
  /** syncLine() + rememberSync() for one line, as POST /messaging/templates/health runs it. */
  syncLine: (line: WaLine, now: Date) => Promise<TemplateLineSync>;
  /** activeNumberId(): the role's number in module mode; undefined under legacy. */
  activeNumberId: (line: WaLine) => string | undefined;
}

/** The answer before any read: nothing counted, nothing written. */
export const unread = (numberId: string, now: Date) => ({
  number_id: numberId,
  checked_at: now.toISOString(),
  meta_count: 0,
  synced: 0,
  number_ids: [],
});

/** A line's sync as the number card's answer; written = this number when the sync read the list. */
function lineAsNumber(sync: TemplateLineSync, numberId: string): TemplateNumberSyncView {
  const { line, ok, error, message, checked_at, meta_count, synced } = sync;
  const said = {
    ...(error === undefined ? {} : { error }),
    ...(message === undefined ? {} : { message }),
  };
  return {
    number_id: numberId,
    line,
    ok,
    ...said,
    checked_at,
    meta_count,
    synced,
    number_ids: ok ? [numberId] : [],
  };
}

/** Legacy: the number's role names its line (404 unknown_number; a calls number has none). */
export async function syncByLine(
  deps: NumberLineDeps,
  numberId: string,
  now: Date,
): Promise<TemplateNumberSyncView> {
  const ref = await deps.queries.numberRef(numberId);
  if (!ref) throw waHttpError('unknown_number', 404);
  const line = isWaLine(ref.purpose) ? ref.purpose : null;
  if (!line) return { ...unread(numberId, now), ok: false, error: CALLS_NO_TEMPLATES };
  return lineAsNumber(await deps.syncLine(line, now), numberId);
}

/**
 * Module mode, a crm number: its role's own number reads the CRM's list as «القوالب» does for that
 * line
 * (docs/39); any other crm number answers crm_managed (its key is not the line's, nothing is read).
 */
export async function syncCrmNumber(
  deps: NumberLineDeps,
  n: OverlayNumber,
  now: Date,
): Promise<TemplateNumberSyncView> {
  const line = isWaLine(n.purpose) && deps.activeNumberId(n.purpose) === n.id ? n.purpose : null;
  if (!line) return { ...unread(n.id, now), ok: false, error: CRM_MANAGED };
  return lineAsNumber(await deps.syncLine(line, now), n.id);
}
