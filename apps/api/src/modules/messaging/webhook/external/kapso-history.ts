import type { KapsoLineEnv } from '../../../../config/env/env';
import { graphJson, type FetchLike, type GraphConn } from '../../whatsapp/drivers/meta/graph';
import { get } from '../parse/webhook.parse';

// Kapso's message history (its Meta proxy, docs/19): read-only, with the line's project key
// (X-API-Key, graph.ts authHeaders). GET /{phone_number_id}/messages/{wamid} for one message and
// GET /{phone_number_id}/messages?direction=…&since=…&limit=…&after=… for a page; both
// return Meta's message object plus the `kapso(...)` fields asked for. Never sends anything.

/** The Kapso extras an external row needs: direction, status, recipient and media metadata. */
export const KAPSO_FIELDS = 'kapso(direction,status,phone_number,media_data)';
/** An inbound page adds the family's WhatsApp name (a lead created by the catch-up gets it). */
export const INBOUND_FIELDS = 'kapso(direction,status,phone_number,media_data,contact_name)';
/** Kapso's page size cap. */
export const PAGE_LIMIT = 100;
/** A webhook item must answer within the 5 s budget; the job is not in a hurry. */
const READ_TIMEOUT_MS = 4_000;

interface HistoryPage {
  messages: unknown[];
  /** The next page's cursor; undefined when the list is done. */
  after: string | undefined;
}

interface PageQuery {
  /** ISO time: messages from then on. */
  since: string;
  after?: string;
}

type Directed = PageQuery & { direction: 'outbound' | 'inbound' };

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export class KapsoHistory {
  constructor(private readonly fetch: FetchLike = (url, init) => globalThis.fetch(url, init)) {}

  private conn(env: KapsoLineEnv): GraphConn {
    return { env, fetch: this.fetch, timeoutMs: READ_TIMEOUT_MS };
  }

  /** One message by its wamid; null when Kapso has none. Throws WaError on an HTTP error. */
  async message(env: KapsoLineEnv, waMessageId: string): Promise<unknown> {
    const path = `${encodeURIComponent(env.phoneNumberId)}/messages/${encodeURIComponent(waMessageId)}`;
    const body = await graphJson(this.conn(env), { path: `${path}?${new URLSearchParams({ fields: KAPSO_FIELDS })}` });
    const data = get(body, 'data');
    const m = data !== undefined && !Array.isArray(data) ? data : body;
    return m !== null && typeof m === 'object' ? m : null;
  }

  /**
   * One page of outbound messages since `since`. Kapso sends no paging.next (like its template
   * list, kapso.ts): a full page with an `after` cursor means there may be more.
   */
  outbound(env: KapsoLineEnv, q: PageQuery): Promise<HistoryPage> {
    return this.page(env, { ...q, direction: 'outbound' });
  }

  /** One page of the families' messages since `since` (the inbound catch-up, external/inbound). */
  inbound(env: KapsoLineEnv, q: PageQuery): Promise<HistoryPage> {
    return this.page(env, { ...q, direction: 'inbound' });
  }

  private async page(env: KapsoLineEnv, q: Directed): Promise<HistoryPage> {
    const { direction, since } = q;
    const limit = String(PAGE_LIMIT);
    const fields = direction === 'inbound' ? INBOUND_FIELDS : KAPSO_FIELDS;
    const params = new URLSearchParams({ direction, since, limit, fields });
    if (q.after) params.set('after', q.after);
    const path = `${encodeURIComponent(env.phoneNumberId)}/messages?${params}`;
    const body = await graphJson(this.conn(env), { path });
    const messages = list(get(body, 'data'));
    const cursor = get(body, 'paging.cursors.after');
    const full = messages.length >= PAGE_LIMIT;
    return { messages, after: typeof cursor === 'string' && cursor && full ? cursor : undefined };
  }
}
