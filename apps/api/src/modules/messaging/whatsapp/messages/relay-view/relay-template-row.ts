import { isRelayDedupKey } from '@/modules/messaging/whatsapp/relay/relay.dedup';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { numberedParams } from '@/modules/messaging/whatsapp/templates/names/template-match';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// A template the old Apps Script sent through the script relay, shown like our own template rows
// (owner 2026-11-02): «قالب: …», the filled body and its buttons. Read side only, no DB write:
// the relay row stays as the relay wrote it (no template_key, so the sender never treats it as a
// template) and keeps its readable body «[name]\nvalue 1\nvalue 2…» (relay.kinds.ts).

type RelayRow = Pick<ThreadMessageRow, 'direction' | 'dedup_key' | 'body' | 'template_key'>;

/** The relay's readable body: the template's name and its values, in order; null otherwise. */
export function relayBody(body: string | null): { name: string; values: string[] } | null {
  const [head = '', ...values] = (body ?? '').split('\n');
  const name = /^\[([^\][]+)\]$/.exec(head)?.[1];
  return name ? { name, values } : null;
}

const isRelayRow = (row: RelayRow): boolean =>
  row.direction === 'outbound' && isRelayDedupKey(row.dedup_key) && row.template_key === null;

/** The template name in a relay row's body; null for any other row. */
export function relayTemplateName(row: RelayRow): string | null {
  return isRelayRow(row) ? (relayBody(row.body)?.name ?? null) : null;
}

function relayParams(row: RelayRow, t: TemplateRow): Record<string, string> | null {
  const parsed = relayBody(row.body);
  return parsed ? numberedParams(parsed.values, t) : null;
}

/**
 * A relay row as the template row it stands for: its key and values, no body of its own (the
 * view renders the template's). Anything that does not fit (no template, a value count that is
 * not the template's) stays the raw row.
 */
export function asRelayTemplateRow<R extends RelayRow>(row: R, t: TemplateRow | null): R {
  const params = t && isRelayRow(row) ? relayParams(row, t) : null;
  if (params === null || !t) return row;
  return { ...row, template_key: t.key, template_params: params, body: null };
}
