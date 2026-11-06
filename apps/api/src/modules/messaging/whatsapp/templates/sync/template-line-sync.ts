import type { TemplateLineFacts, TemplateLineSync, WaLine, WaProvider } from '@ab/shared';
import { lineFacts, readError } from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { newStarters } from './template-import';
import {
  crmSyncPatch, wabaSyncPatch,
} from '@/modules/messaging/whatsapp/templates/names/template-waba-match';
import { EVOLUTION_NO_TEMPLATES } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { TemplatePatch } from './template-sync';
import {
  WaError, type MetaTemplate, type TemplateRow, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

// One number's sync with Meta (owner 2026-10-18: «more options to sync it with meta for each number»):
// only that line's rows, against only that line's WABA list, then that WABA's new templates imported.
// A row is never matched against (nor marked missing from) the other WABA's list.

interface Warn { warn: (message: string) => void }

export interface LineSyncDeps {
  queries: Pick<TemplatesRepo, 'all' | 'update' | 'insert'>;
  lines: WhatsappLines;
  log: Warn;
}

const empty = (facts: TemplateLineFacts, now: Date) => ({ ...facts, checked_at: now.toISOString(), meta_count: 0, synced: 0, imported: [], skipped: [] });

/** The line's Meta list, or its failure as the line's error (never thrown: the other line still syncs). */
async function readList(deps: LineSyncDeps, line: WaLine): Promise<MetaTemplate[] | { error: string; message?: string }> {
  try {
    return await deps.lines[line].getTemplates();
  } catch (e) {
    if (!(e instanceof WaError)) throw e;
    deps.log.warn(`${line} line templates not read: ${e.message}`);
    return readError(e);
  }
}

/** Drivers whose templates we never list: Evolution's (docs/19); the CRM's we do (docs/39). */
const NO_LIST: Partial<Record<WaProvider, string>> = {
  evolution: EVOLUTION_NO_TEMPLATES,
};

interface LineRead {
  line: WaLine;
  list: MetaTemplate[];
  now: Date;
}

type RowPatch = (row: TemplateRow, list: readonly MetaTemplate[], now: Date) => TemplatePatch;

/** Only this line's rows, each by the patch of its driver. */
async function updateRows(deps: LineSyncDeps, read: LineRead, patch: RowPatch) {
  const rows = await deps.queries.all();
  let synced = 0;
  for (const row of rows.filter((r) => r.line === read.line)) {
    if (await deps.queries.update(row.key, patch(row, read.list, read.now))) synced += 1;
  }
  return { rows, synced };
}

/** The WABA's new templates as rows (a meta / kapso line only). */
async function importNew(deps: LineSyncDeps, read: LineRead, known: TemplateRow[]) {
  const { line, list, now } = read;
  const plan = newStarters({ meta: list, known, now, line });
  plan.skipped.forEach((s) => deps.log.warn(`${line} template ${s.name} not imported: ${JSON.stringify(s.reason)}`));
  const saved = await Promise.all(plan.rows.map((row) => deps.queries.insert(row)));
  return { imported: saved.flatMap((row) => (row ? [row.key] : [])), skipped: plan.skipped };
}

/**
 * POST /messaging/templates/health for one line; an unconfigured line answers not_configured and
 * reads nothing. A crm line reads the CRM's list (docs/39): status only, by the name each row is
 * sent under, nothing imported and nothing marked missing because of the CRM. A CRM without
 * /templates answers crm_managed (readError) and no row is touched.
 */
export async function syncLine(deps: LineSyncDeps, line: WaLine, now: Date): Promise<TemplateLineSync> {
  const facts = lineFacts(line, deps.lines[line]);
  const elsewhere = NO_LIST[facts.provider];
  if (elsewhere) return { ...empty(facts, now), ok: false, error: elsewhere };
  if (!facts.configured) return { ...empty(facts, now), ok: false, error: 'not_configured' };
  const list = await readList(deps, line);
  if (!Array.isArray(list)) return { ...empty(facts, now), ok: false, ...list };
  const crm = facts.provider === 'crm';
  const read = { line, list, now };
  const { rows, synced } = await updateRows(deps, read, crm ? crmSyncPatch : wabaSyncPatch);
  // A crm line imports nothing: the CRM account's other templates are not the platform's to send.
  const found = crm ? { imported: [], skipped: [] } : await importNew(deps, read, rows);
  return { ...facts, ok: true, checked_at: now.toISOString(), meta_count: list.length, synced, ...found };
}

/** A line's sync result for lineViews(); a failed write only logs (the sync itself is done). */
export async function rememberSync(
  deps: { queries: Pick<TemplatesRepo, 'saveLineSync'>; log: Warn },
  sync: TemplateLineSync,
): Promise<void> {
  await deps.queries.saveLineSync(sync).catch((e: unknown) => {
    deps.log.warn(`template line sync not stored: ${e instanceof Error ? e.message : String(e)}`);
  });
}
