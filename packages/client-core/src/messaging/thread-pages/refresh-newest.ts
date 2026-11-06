import type { ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { leavesGap, mergeNewest } from './thread-edits.js';

/** An open chat's cache as the app's query client reaches it. */
export interface NewestCache<T extends ThreadPages> {
  /** The chat is on screen: a GET stamps its inbound rows read, so a hidden chat waits. */
  shown: () => boolean;
  read: () => T | undefined;
  write: (edit: (old: T | undefined) => T | undefined) => void;
  /** GET /threads/:phone with no page param: the newest page only. */
  newest: () => Promise<ThreadDetail>;
  /** Every loaded page again (nothing loaded yet, or a gap); only marks a hidden chat stale. */
  reload: () => Promise<void>;
}

/**
 * After a send (docs/43 AU4, docs/44 BUG3): one read of the newest page folded in by mergeNewest,
 * however many older pages she scrolled through (they are not re-read). A gap re-reads them all; a
 * failed read leaves the cache as it is (the chat's polls catch up), so a send never fails on it.
 */
export async function refreshNewest<T extends ThreadPages>(cache: NewestCache<T>): Promise<void> {
  if (!cache.shown() || !cache.read()) return cache.reload();
  const fresh = await cache.newest().catch(() => null);
  if (fresh && leavesGap(cache.read(), fresh)) return cache.reload();
  if (fresh) cache.write((old) => mergeNewest(old, fresh));
}
