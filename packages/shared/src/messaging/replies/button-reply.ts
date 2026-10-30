// A family's tap on a template button (owner 2026-10-28): WhatsApp shows it as their message with the
// tapped label, quoting our template. The webhook keeps Meta's part as messages.interactive_payload:
// `{ type: 'button', button: { text, payload } }` (a template quick reply) or
// `{ type: 'interactive', interactive: { type: 'button_reply' | 'list_reply', …: { id, title } } }`.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const text = (v: unknown, key: string): string | null => {
  const value = isRecord(v) ? v[key] : undefined;
  return typeof value === 'string' && value.trim() ? value : null;
};

/** The label the family tapped (a quick reply, a reply button or a list row); null for anything else. */
export function tappedButton(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (payload['type'] === 'button') return text(payload['button'], 'text');
  if (payload['type'] !== 'interactive') return null;
  const part = payload['interactive'];
  const kind = isRecord(part) ? part['type'] : undefined;
  if (kind !== 'button_reply' && kind !== 'list_reply') return null;
  return text(isRecord(part) ? part[kind] : undefined, 'title');
}
