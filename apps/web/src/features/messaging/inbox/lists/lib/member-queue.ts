// «القوائم» saves, one queue per (list, chat): a box's saves never overlap, and the last intent wins.

export interface MemberIntent {
  id: string;
  phone: string;
  member: boolean;
}

export interface MemberQueueDeps {
  /** PUT (in) / DELETE (out). */
  send: (intent: MemberIntent) => Promise<unknown>;
  /** After the box's last save: refetch the lists and the chat (awaited before the box follows the cache). */
  settle: () => Promise<unknown>;
  /** The box's final save failed. */
  onFail: () => void;
}

const keyOf = (phone: string, id: string) => `${phone} ${id}`;

/** The wanted state of every box with a save in flight (or awaiting its refetch). */
let wanted: ReadonlyMap<string, boolean> = new Map();
const listeners = new Set<() => void>();

function setWanted(key: string, on: boolean | null) {
  const next = new Map(wanted);
  if (on === null) next.delete(key);
  else next.set(key, on);
  wanted = next;
  listeners.forEach((l) => l());
}

export function subscribeMemberQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const memberQueueSnapshot = () => wanted;

/** The chat's lists as the checklist shows them: the cached membership, with every in-flight box's intent on top. */
export function overlayIntents(cached: Iterable<string>, phone: string, intents: ReadonlyMap<string, boolean>): Set<string> {
  const ids = new Set(cached);
  const prefix = keyOf(phone, '');
  for (const [key, on] of intents) {
    if (!key.startsWith(prefix)) continue;
    const id = key.slice(prefix.length);
    if (on) ids.add(id);
    else ids.delete(id);
  }
  return ids;
}

/** Every toggle's number per box, so a toggle during the refetch is never lost. */
const seqs = new Map<string, number>();

/** Saves until the server holds the box's latest intent; sends nothing while a save of that box is in flight. */
async function drain(key: string, intent: MemberIntent, deps: MemberQueueDeps) {
  let done: number | undefined;
  let saved: boolean | null = null;
  let failed = false;
  while (seqs.get(key) !== done) {
    done = seqs.get(key);
    const want = wanted.get(key) ?? intent.member;
    if (want !== saved) {
      try {
        await deps.send({ ...intent, member: want });
        saved = want;
        failed = false;
      } catch {
        // The server's state is unknown: a newer intent is always sent; otherwise the box follows the refetch.
        saved = null;
        failed = true;
      }
    }
    if (seqs.get(key) === done) await deps.settle().catch(() => undefined);
  }
  seqs.delete(key);
  setWanted(key, null);
  if (failed) deps.onFail();
}

/** Records the box's intent and starts its queue unless one is already running. */
export function enqueueMember(intent: MemberIntent, deps: MemberQueueDeps): void {
  const key = keyOf(intent.phone, intent.id);
  const seq = seqs.get(key);
  seqs.set(key, (seq ?? 0) + 1);
  setWanted(key, intent.member);
  if (seq === undefined) void drain(key, intent, deps);
}
