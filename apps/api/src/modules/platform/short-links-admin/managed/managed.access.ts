import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import type { ShortLinkRow } from '@/modules/platform/short-links';

/**
 * Who sees which managed links (docs/19): short_links.all (the admin by default)
 * every link; anyone else with short_links.manage (sales) only the links they made.
 */
export const ownerScope = (user: AuthUser): string | null =>
  can(user, 'short_links.all') ? null : user.id;

/** May this user read and change this link? */
export const mayManage = (user: AuthUser, row: ShortLinkRow): boolean =>
  can(user, 'short_links.all') || row.created_by === user.id;

/** The link when the user may manage it; the same 404 as an unknown code otherwise. */
export function managedOrThrow(user: AuthUser, row: ShortLinkRow | null): ShortLinkRow {
  if (!row || !mayManage(user, row)) throw notFound('short_link_not_found');
  return row;
}
