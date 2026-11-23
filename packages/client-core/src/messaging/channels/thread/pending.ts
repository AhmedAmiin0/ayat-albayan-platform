import type { ChannelMessageView, ChannelPage } from '@ab/shared';

// The optimistic row of a send (review 2026-11-17), web and phone alike: shown at once, keyed by
// its client_id, until the API's answer re-reads the thread; a failure takes it away again.

const PENDING = 'pending:';

/** The optimistic row's id for a send. */
const pendingId = (clientId: string): string => `${PENDING}${clientId}`;

/** Still sending: no menu and no swipe. */
export const isPending = (m: Pick<ChannelMessageView, 'id'>): boolean => m.id.startsWith(PENDING);

interface PendingInput {
  body: string;
  clientId: string;
  /** The device's clock: only until the API's own time comes back. */
  at: Date;
}

/** My message as it will look once the API has it, before it does. */
export function pendingMessage({ body, clientId, at }: PendingInput): ChannelMessageView {
  return {
    ...{ id: pendingId(clientId), body, sender_role: 'unknown', sender_name: '', mine: true },
    ...{ created_at: at.toISOString(), edited: false, deleted: false, kind: 'text' },
    ...{ attachment: null, reply_to: null, read_by_all: false, client_id: clientId },
  };
}

/** The cached thread (an infinite query's data): the newest page first. */
interface CachedPages {
  pages: ChannelPage[];
}

/**
 * The cached thread with `row` as its newest message (the newest page's last), replacing an
 * earlier row of the same id (a retry); nothing cached yet → left as it is.
 */
export function withPending<T extends CachedPages>(
  data: T | undefined,
  row: ChannelMessageView,
): T | undefined {
  const [newest, ...older] = data?.pages ?? [];
  if (!data || !newest) return data;
  const messages = [...newest.messages.filter((m) => m.id !== row.id), row];
  return { ...data, pages: [{ ...newest, messages }, ...older] };
}

/**
 * The cached thread without the pending row of `clientId` (a failed send), every page searched;
 * whatever else arrived meanwhile (a live message, an edit) stays. Nothing cached → as it is.
 */
export function withoutPending<T extends CachedPages>(
  data: T | undefined,
  clientId: string,
): T | undefined {
  if (!data) return data;
  const id = pendingId(clientId);
  const pages = data.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== id) }));
  return { ...data, pages };
}
