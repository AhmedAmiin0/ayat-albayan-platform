import type { GooglePlannedRequest } from '@ab/shared';
import type { GoogleClient } from '../google-client.port';
import type { ItemResult, SyncItem } from './google-items.queries';

/** One pass's mode: dry_run plans with NO Google call at all; live has a client. */
export type WriteCtx = { live: false } | { live: true; google: GoogleClient };

export const planned = (p: GooglePlannedRequest): ItemResult => ({ state: 'skipped', reason: 'dry_run', planned: p });
export const synced = (input: { googleId: string | null; parentId: string | null; hash: string | null }): ItemResult => ({ state: 'synced', ...input });
/** Not this item's turn yet (the PDF is still rendering, its sheet not made yet): back in 15 s, no attempt used. */
export const later = (item: SyncItem, why: string): ItemResult => ({ state: 'retry', error: why, attempts: item.attempts, at: new Date(Date.now() + 15_000) });

/** A writer of one item kind. Throws Google errors; the processor classifies them. */
export interface ItemWriter {
  write(item: SyncItem, ctx: WriteCtx): Promise<ItemResult>;
}
