import type { CrmBody } from '@/modules/messaging/whatsapp/drivers/crm/crm-body';
import { numberedParams } from '@/modules/messaging/whatsapp/templates/names/template-match';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { RelayOf, RelayRequest, RelayType } from './relay.schema';

// One strategy per script message type (rule 11): the CRM body the driver posts, the readable text
// the chat bubble shows (body, kept for search), the parts of its dedup key, and the template it
// names (the chat shows it like our own template rows, owner 2026-11-02).

/** A template the script sent: its name, body values in order, the first button's value. */
export interface RelayTemplateCall {
  name: string;
  values: string[];
  button: string | undefined;
}

interface RelayKind<T extends RelayType> {
  crm(req: RelayOf<T>): CrmBody;
  readable(req: RelayOf<T>): string;
  dedupParts(req: RelayOf<T>): string[];
  template(req: RelayOf<T>): RelayTemplateCall | null;
}

type RelayKinds = { [T in RelayType]: RelayKind<T> };

/** The contact's display name, only when the script gave one. */
const named = (name: string | undefined): { name?: string } => (name ? { name } : {});

const lines = (parts: (string | undefined)[]): string => parts.filter(Boolean).join('\n');

const KINDS: RelayKinds = {
  template: {
    crm: (r) => ({
      to: r.to,
      type: 'template',
      template: { name: r.template.name, language: r.template.language, params: r.template.params },
      ...named(r.name),
    }),
    readable: (r) => lines([`[${r.template.name}]`, ...(r.template.params.body ?? [])]),
    dedupParts: (r) => [r.template.name, JSON.stringify(r.template.params.body ?? [])],
    template: (r) => ({
      name: r.template.name,
      values: r.template.params.body ?? [],
      button: Object.values(r.template.params.buttonParams ?? {})[0],
    }),
  },
  text: {
    crm: (r) => ({ to: r.to, type: 'text', text: r.text, ...named(r.name) }),
    readable: (r) => r.text,
    dedupParts: (r) => [r.text],
    template: () => null,
  },
  document: {
    crm: (r) => ({
      to: r.to,
      type: 'document',
      media_url: r.link,
      ...(r.filename ? { filename: r.filename } : {}),
      ...(r.caption ? { text: r.caption } : {}),
      ...named(r.name),
    }),
    readable: (r) => lines([r.caption, r.filename && `📄 ${r.filename}`, r.link]),
    dedupParts: (r) => [r.caption ?? '', r.link],
    template: () => null,
  },
};

/** The strategy of this request's type, typed to it. */
function kindOf<T extends RelayType>(req: RelayOf<T>): RelayKind<T> {
  const kinds: { [K in RelayType]: RelayKind<K> } = KINDS;
  return kinds[req.type];
}

export const relayCrmBody = (req: RelayRequest): CrmBody => kindOf(req).crm(req);
export const relayReadable = (req: RelayRequest): string => kindOf(req).readable(req);
export const relayDedupParts = (req: RelayRequest): string[] => kindOf(req).dedupParts(req);
export const relayTemplateCall = (req: RelayRequest): RelayTemplateCall | null =>
  kindOf(req).template(req);

/** The row's catalog template (chat display only: what is sent never reads it). */
export interface RelayTemplateFields {
  key: string;
  params: Record<string, string>;
}

const withButton = (button: string | undefined): { button?: string } =>
  button === undefined ? {} : { button };

/**
 * Stored like our own template rows (owner 2026-11-02): the key and the values as
 * messages.template_params («1», «2», …, «button»); null (a raw row, as before) when no catalog
 * row matches or the value count is not its own.
 */
export function relayTemplateFields(
  call: RelayTemplateCall,
  t: TemplateRow | null,
): RelayTemplateFields | null {
  const values = t ? numberedParams(call.values, t) : null;
  if (!values || !t) return null;
  return { key: t.key, params: { ...values, ...withButton(call.button) } };
}
