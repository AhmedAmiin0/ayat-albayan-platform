import type { CrmBody } from '@/modules/messaging/whatsapp/drivers/crm/crm-body';
import type { RelayOf, RelayRequest, RelayType } from './relay.schema';

// One strategy per script message type (rule 11): the CRM body the driver posts, the readable text
// the chat bubble shows (body: no platform template row is needed) and the parts of its dedup key.

interface RelayKind<T extends RelayType> {
  crm(req: RelayOf<T>): CrmBody;
  readable(req: RelayOf<T>): string;
  dedupParts(req: RelayOf<T>): string[];
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
  },
  text: {
    crm: (r) => ({ to: r.to, type: 'text', text: r.text, ...named(r.name) }),
    readable: (r) => r.text,
    dedupParts: (r) => [r.text],
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
