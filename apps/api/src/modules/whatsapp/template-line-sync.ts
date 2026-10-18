import type { TemplateLineFacts, TemplateLineSync, WaLine } from '@ab/shared';
import { lineFacts, readError } from './template-env';
import { newStarters } from './template-import';
import { findMeta, syncPatch } from './template-sync';
import type { TemplatesQueries } from './templates.queries';
import { WaError, type MetaTemplate, type WhatsappLines } from './whatsapp.types';

// One number's sync with Meta (owner 2026-10-18: «more options to sync it with meta for each number»):
// only that line's rows, against only that line's WABA list, then that WABA's new templates imported.
// A row is never matched against (nor marked missing from) the other WABA's list.

type Warn = { warn: (message: string) => void };

export interface LineSyncDeps {
  queries: Pick<TemplatesQueries, 'all' | 'update' | 'insert'>;
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

/** POST /messaging/templates/health for one line; an unconfigured line answers not_configured and reads nothing. */
export async function syncLine(deps: LineSyncDeps, line: WaLine, now: Date): Promise<TemplateLineSync> {
  const facts = lineFacts(line, deps.lines[line]);
  if (!facts.configured) return { ...empty(facts, now), ok: false, error: 'not_configured' };
  const list = await readList(deps, line);
  if (!Array.isArray(list)) return { ...empty(facts, now), ok: false, ...list };
  const rows = await deps.queries.all();
  let synced = 0;
  for (const row of rows.filter((r) => r.line === line)) {
    if (await deps.queries.update(row.key, syncPatch(row, findMeta(row, list), now))) synced += 1;
  }
  const plan = newStarters({ meta: list, known: rows, now, line });
  plan.skipped.forEach((s) => deps.log.warn(`${line} template ${s.name} not imported: ${JSON.stringify(s.reason)}`));
  const saved = await Promise.all(plan.rows.map((row) => deps.queries.insert(row)));
  const imported = saved.flatMap((row) => (row ? [row.key] : []));
  return { ...facts, ok: true, checked_at: now.toISOString(), meta_count: list.length, synced, imported, skipped: plan.skipped };
}
