// CRM (Meta) template buttons → message_templates.buttons ({ type: 'url', url, text? }, docs/12).
// Quick-reply buttons need an intent (confirm / reschedule / stop) the CRM does not know: such a
// template goes to review instead of guessing.

export interface UrlButton {
  type: 'url';
  url: string;
  text?: string;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function urlButton(b: unknown): UrlButton | undefined {
  if (!b || typeof b !== 'object') return undefined;
  const rec = b as Record<string, unknown>;
  const url = str(rec['url']);
  if (str(rec['type'])?.toUpperCase() !== 'URL' || !url) return undefined;
  const text = str(rec['text']);
  return text ? { type: 'url', url, text } : { type: 'url', url };
}

/** undefined = a button we cannot represent (quick reply, phone, malformed). null/[] = none. */
export function templateButtons(raw: unknown): UrlButton[] | undefined {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return undefined;
  const out = (raw as unknown[]).map(urlButton);
  return out.every((b): b is UrlButton => b !== undefined) ? out : undefined;
}
