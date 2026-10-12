import { useHolds } from '@/auth/use-permissions';
import type { PushTree } from '@/push/notification-route';
import { BellButton } from './BellButton';

/**
 * The bell of a tree whose role may lack notifications.push (sales, classroom assistant): shown
 * only once /auth/me lists it, so a role without it never sees a bell (nor a flash of one).
 */
export function HeldBell({ tree }: { tree: PushTree }) {
  return useHolds('notifications.push') ? <BellButton tree={tree} /> : null;
}
