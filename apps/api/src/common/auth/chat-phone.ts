import { can } from './permissions';
import type { AuthUser } from './verify-token';

/**
 * A family's phone on a sales page (owner 2026-10-27): only for whoever may open the chats
 * (inbox.read), where that phone already shows; null for anyone else, whatever page asks.
 */
export function chatPhone(user: AuthUser, phone: string | null | undefined): string | null {
  return phone && can(user, 'inbox.read') ? phone : null;
}
