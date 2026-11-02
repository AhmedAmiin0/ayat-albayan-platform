import type { Json } from '@ab/db';
import { isRelayDedupKey } from '@/modules/messaging/whatsapp/relay/relay.dedup';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { numberedParams } from '@/modules/messaging/whatsapp/templates/names/template-match';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// A template the old Apps Script sent through the script relay, shown like our own template rows
// (owner 2026-11-02): «قالب: …», the filled body and its buttons. Read side only, no DB write.
// Rows from before the relay stored template_key keep only their readable body
// «[name]\nvalue 1\nvalue 2…» (relay.kinds.ts): the name in brackets, then one value per line.

type RelayRow = Pick<
  ThreadMessageRow,
  'direction' | 'dedup_key' | 'body' | 'template_key' | 'template_params'
>;

/** The relay's readable body: the template's name and its values, in order; null otherwise. */
export function relayBody(body: string | null): { name: string; values: string[] } | null {
  const [head = '', ...values] = (body ?? '').split('\n');
  const name = /^\[([^\][]+)\]$/.exec(head)?.[1];
  return name ? { name, values } : null;
}

const isRelayRow = (row: RelayRow): boolean =>
  row.direction === 'outbound' && isRelayDedupKey(row.dedup_key);

/**
 * The template name to look up for a relay row: its stored key (newer rows), else the name in
 * its body; null for any other row.
 */
export function relayTemplateName(row: RelayRow): string | null {
  if (!isRelayRow(row)) return null;
  return row.template_key ?? relayBody(row.body)?.name ?? null;
}

/** Stored by the relay itself (newer rows): its own key and values are kept as they are. */
const storedFor = (row: RelayRow, t: TemplateRow): boolean =>
  row.template_key === t.key && row.template_params !== null;

function relayParams(row: RelayRow, t: TemplateRow): Json | null {
  if (storedFor(row, t)) return row.template_params;
  const parsed = row.template_key === null ? relayBody(row.body) : null;
  return parsed ? numberedParams(parsed.values, t) : null;
}

/**
 * A relay row as the template row it stands for: its key and values, no body of its own (the
 * view renders the template's). Anything that does not fit (no template, another key, a value
 * count that is not the template's) stays the raw row.
 */
export function asRelayTemplateRow<R extends RelayRow>(row: R, t: TemplateRow | null): R {
  const params = t && isRelayRow(row) ? relayParams(row, t) : null;
  if (params === null || !t) return row;
  return { ...row, template_key: t.key, template_params: params, body: null };
}
