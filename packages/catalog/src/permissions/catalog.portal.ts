import type { Permission } from './catalog';
import type { UserRole } from './roles';

/**
 * The portal roles' FIXED grants (docs/50 §5 item 6): what a guardian or student login holds beside
 * self.portal, whatever role_permissions says. Their rows stay empty (migration 433) and the matrix
 * refuses edits to them (400 portal_role_fixed), so this list is the only place they change.
 * notifications.push: the family app's bell and its device registration (PUT /me/push-tokens).
 */
export const PORTAL_FIXED_GRANTS: Readonly<Partial<Record<UserRole, readonly Permission[]>>> = {
  guardian: ['notifications.push'],
  student: ['notifications.push'],
};
