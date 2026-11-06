import { createHash } from 'node:crypto';
import { isHiddenPayload } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { visibleToSales } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import type { DeltaCaller } from './thread-delta.service';

/** What one caller's sync covers, resolved per request (rule 9). */
export interface SyncScope {
  /** null = every chat (admin, sales); a teacher's scope phones otherwise. */
  phones: string[] | null;
  /** The academy's own numbers: never synced. */
  hide: string[];
  /** Changes whenever what the caller may see changes: the phone wipes and resyncs. */
  key: string;
}

type Kind = DeltaCaller['kind'];
type Row = Pick<ThreadMessageRow, 'template_key' | 'interactive_payload'>;

/** A bubble of any chat: never a reaction / edit / revoke marker row (migrations 900, 992). */
const bubble = (row: Row): boolean => !isHiddenPayload(row.interactive_payload);

/** Rows each role may hold: sales never the two signed-link templates (migration 187). */
const VISIBLE: Record<Kind, (row: Row) => boolean> = {
  admin: bubble,
  teacher: bubble,
  sales: (row) => bubble(row) && visibleToSales(row),
};

/** May this caller hold the row? A row it may not is a `gone` tombstone, never a bubble. */
export const visibleTo = (kind: Kind, row: Row): boolean => VISIBLE[kind](row);

const phonesOf = (caller: DeltaCaller): string[] | null =>
  caller.kind === 'teacher' ? [...caller.scope.phones].sort() : null;

/** The scope from the caller and the own numbers; the key hashes both (no phone in the payload). */
export function syncScope(caller: DeltaCaller, own: ReadonlySet<string>): SyncScope {
  const phones = phonesOf(caller);
  const hide = [...own].sort();
  const digest = createHash('sha256').update(JSON.stringify({ phones, hide })).digest('hex');
  return { phones, hide, key: `${caller.kind}:${digest.slice(0, 16)}` };
}
