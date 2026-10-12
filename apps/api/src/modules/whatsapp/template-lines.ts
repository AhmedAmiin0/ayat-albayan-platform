import type { TemplateView } from '@ab/shared';
import { newStarters, type MetaLists } from './template-import';
import { toTemplateView } from './template.mapper';
import type { TemplatesQueries } from './templates.queries';
import type { MetaTemplate, TemplateRow } from './whatsapp.types';

// The health check's chat-line side (owner 2026-10-12, docs/12 §3.4), out of template.registry.ts
// (150-line cap): the chat WABA's list, and its new templates imported (only the restricted defaults flagged).

type Warn = { warn: (message: string) => void };

/**
 * The chat line's list: `read` is null when that line is not configured (the registry makes the Meta
 * call, docs/12 §13.5); a failed read is logged and leaves chat rows as they are.
 */
export async function chatList(read: (() => Promise<MetaTemplate[]>) | null, log: Warn): Promise<Pick<MetaLists, 'chat' | 'chatOn'>> {
  if (!read) return { chat: null, chatOn: false };
  try {
    return { chat: await read(), chatOn: true };
  } catch (e) {
    log.warn(`chat line templates not read: ${e instanceof Error ? e.message : String(e)}`);
    return { chat: null, chatOn: true };
  }
}

export interface ImportInput {
  queries: Pick<TemplatesQueries, 'insert'>;
  /** Every registry row before the import. */
  known: readonly TemplateRow[];
  lists: MetaLists;
  now: Date;
  log: Warn;
}

/** Approved chat-WABA templates the registry does not know → chat rows (starters); each skipped one is logged by name. */
export async function importStarters(input: ImportInput): Promise<TemplateView[]> {
  const plan = newStarters({ meta: input.lists.chat ?? [], known: input.known, now: input.now });
  plan.skipped.forEach((s) => input.log.warn(`chat template ${s.name} not imported: ${s.reason}`));
  const saved = await Promise.all(plan.rows.map((row) => input.queries.insert(row)));
  return saved.flatMap((row) => (row ? [toTemplateView(row)] : []));
}
