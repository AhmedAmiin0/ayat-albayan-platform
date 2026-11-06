import type { ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { leavesGap, mergeNewest } from './thread-edits.js';

/** An open chat's cache as the app's query client reaches it. */
export interface NewestCache<T extends ThreadPages> {
  /** The chat's query has an active observer (a GET stamps inbound rows read: else it waits). */
  shown: () => boolean;
  /** A read of the chat is in flight (a refetch, an older page), holding the pages it began on. */
  busy: () => boolean;
  read: () => T | undefined;
  write: (edit: (old: T | undefined) => T | undefined) => void;
  /** GET /threads/:phone with no page param: the newest page only. */
  newest: () => Promise<ThreadDetail>;
  /** Every loaded page again, cancelling a read in flight; marks a chat without observer stale. */
  reload: () => Promise<void>;
  /** This send's ids (provisional and the API's): they sit in both pages, so prove no overlap. */
  own?: readonly string[];
}

type Cache = Pick<NewestCache<ThreadPages>, 'shown' | 'busy' | 'read' | 'own'>;

/** No observer, nothing loaded, or a read in flight that would land its older pages after ours. */
const mustReload = (cache: Cache): boolean => !cache.shown() || !cache.read() || cache.busy();

/** Rows this device sent (still queued, or named): never proof that the fresh page overlaps. */
function ownRows(cache: Cache): Set<string> {
  const head = cache.read()?.pages[0]?.messages ?? [];
  const queued = head.filter((m) => m.direction === 'outbound' && m.status === 'queued');
  return new Set([...queued.map((m) => m.id), ...(cache.own ?? [])]);
}

/** A read started meanwhile, or more new rows than one page (merging would hide some). */
const cannotMerge = (cache: Cache, fresh: ThreadDetail): boolean =>
  cache.busy() || leavesGap(cache.read(), fresh, ownRows(cache));

/**
 * After a send (docs/43 AU4, docs/44 BUG3): one read of the newest page folded in by mergeNewest,
 * however many older pages she scrolled through (they are not re-read). A read in flight or a gap
 * re-reads them all instead (the invalidation cancels that read); a failed read leaves the cache
 * as it is (the chat's polls catch up), so a send never fails on it.
 */
export async function refreshNewest<T extends ThreadPages>(cache: NewestCache<T>): Promise<void> {
  if (mustReload(cache)) return cache.reload();
  const fresh = await cache.newest().catch(() => null);
  if (fresh && cannotMerge(cache, fresh)) return cache.reload();
  if (fresh) cache.write((old) => mergeNewest(old, fresh));
}
