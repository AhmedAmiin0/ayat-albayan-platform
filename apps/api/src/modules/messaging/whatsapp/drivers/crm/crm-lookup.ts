import type { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { crmJson, type CrmConn } from './crm-http';
import {
  crmContactSchema,
  crmContactsSchema,
  crmConversationSchema,
  crmConversationsSchema,
  crmMessagesSchema,
  type CrmContact,
  type CrmContactCard,
  type CrmConversation,
  type CrmMessage,
} from './crm-lookup.schemas';

// Read-only CRM lookups that confirm a timed-out send (docs/19 «Confirming an uncertain send»).
// Their own failure handling: never the sender's plan, never a credential hold, never a push. A
// refused key (401 / 403) is a missing scope; anything else (429, 5xx, timeout, odd answer) skips
// the pass.

/** A lookup never waits as long as a send: the webhook answers within its budget. */
const LOOKUP_TIMEOUT_MS = 5_000;
/** The newest messages read per conversation. */
const PAGE = 50;
const REFUSED: ReadonlySet<number> = new Set([401, 403]);

export type LookupFailure = { kind: 'scope'; scope: string } | { kind: 'skip'; reason: string };

/** Why a lookup stopped; the confirm logs it (never a key, phone or body). */
export class CrmLookupError extends Error {
  constructor(readonly failure: LookupFailure) {
    super(failure.kind === 'scope' ? `CRM key lacks ${failure.scope}` : failure.reason);
  }
}

function lookupError(e: unknown, scope: string): CrmLookupError {
  const info = e instanceof WaError ? e.info : null;
  const refused = info !== null && REFUSED.has(info.status);
  if (refused) return new CrmLookupError({ kind: 'scope', scope: info.missingScope ?? scope });
  const reason = (e instanceof Error ? e.message : String(e)).slice(0, 120);
  return new CrmLookupError({ kind: 'skip', reason });
}

interface Read<T> {
  path: string;
  scope: string;
  schema: z.ZodType<T>;
}

async function read<T>(conn: CrmConn, call: Read<T>): Promise<T> {
  const data = await crmJson(conn, { path: call.path }).catch((e: unknown) => {
    throw lookupError(e, call.scope);
  });
  const parsed = call.schema.safeParse(data);
  if (!parsed.success)
    throw new CrmLookupError({ kind: 'skip', reason: `odd ${call.scope} answer` });
  return parsed.data;
}

/** The reads the confirm, its sweep and the inbound mirror make. */
export interface CrmLookup {
  contact: (id: string) => Promise<CrmContactCard>;
  conversation: (id: string) => Promise<CrmConversation>;
  messages: (conversationId: string) => Promise<CrmMessage[]>;
  contacts: (search: string) => Promise<CrmContact[]>;
  conversationsOf: (contactId: string) => Promise<string[]>;
}

const enc = encodeURIComponent;

/** The lookups over a line's CRM env (same base and bearer key as its sends), 5 s each. */
export function crmLookup(env: CrmLineEnv, fetch: CrmConn['fetch']): CrmLookup {
  const conn: CrmConn = { env, fetch, timeoutMs: LOOKUP_TIMEOUT_MS };
  const conversations = 'conversations:read';
  return {
    contact: (id) =>
      read(conn, { path: `contacts/${enc(id)}`, scope: 'contacts:read', schema: crmContactSchema }),
    conversation: (id) =>
      read(conn, {
        path: `conversations/${enc(id)}`,
        scope: conversations,
        schema: crmConversationSchema,
      }),
    messages: (id) =>
      read(conn, {
        path: `conversations/${enc(id)}/messages?limit=${String(PAGE)}`,
        scope: 'messages:read',
        schema: crmMessagesSchema,
      }),
    contacts: (search) =>
      read(conn, {
        path: `contacts?search=${enc(search)}`,
        scope: 'contacts:read',
        schema: crmContactsSchema,
      }),
    conversationsOf: async (contactId) => {
      const path = `conversations?contact_id=${enc(contactId)}`;
      const list = await read(conn, { path, scope: conversations, schema: crmConversationsSchema });
      return list.map((c) => c.id);
    },
  };
}
