import type { TemplateLineFacts, TemplateLineSync, WaLine } from '@ab/shared';
import { lineFacts, readError } from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { newStarters } from './template-import';
import { wabaSyncPatch } from '@/modules/messaging/whatsapp/templates/names/template-waba-match';
import { CRM_MANAGED, EVOLUTION_NO_TEMPLATES } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { WaError, type MetaTemplate, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';

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

/**
 * POST /messaging/templates/health for one line; an unconfigured line answers not_configured and reads
 * nothing. A crm line answers crm_managed (docs/19): no call, and no row is touched (a status the admin set
 * by hand stays; nothing is marked missing or not_submitted because of the CRM).
 */
export async function syncLine(deps: LineSyncDeps, line: WaLine, now: Date): Promise<TemplateLineSync> {
  const facts = lineFacts(line, deps.lines[line]);
  if (facts.provider === 'crm') return { ...empty(facts, now), ok: false, error: CRM_MANAGED };
  if (facts.provider === 'evolution') return { ...empty(facts, now), ok: false, error: EVOLUTION_NO_TEMPLATES };
  if (!facts.configured) return { ...empty(facts, now), ok: false, error: 'not_configured' };
  const list = await readList(deps, line);
  if (!Array.isArray(list)) return { ...empty(facts, now), ok: false, ...list };
  const rows = await deps.queries.all();
  let synced = 0;
  for (const row of rows.filter((r) => r.line === line)) {
    if (await deps.queries.update(row.key, wabaSyncPatch(row, list, now))) synced += 1;
  }
  const plan = newStarters({ meta: list, known: rows, now, line });
  plan.skipped.forEach((s) => deps.log.warn(`${line} template ${s.name} not imported: ${JSON.stringify(s.reason)}`));
  const saved = await Promise.all(plan.rows.map((row) => deps.queries.insert(row)));
  const imported = saved.flatMap((row) => (row ? [row.key] : []));
  return { ...facts, ok: true, checked_at: now.toISOString(), meta_count: list.length, synced, imported, skipped: plan.skipped };
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
