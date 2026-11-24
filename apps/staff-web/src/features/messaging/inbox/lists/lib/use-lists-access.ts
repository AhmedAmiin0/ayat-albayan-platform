import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';

/** Requires inbox.lists and is never shown in teacher mode. */
export function useListsAccess(): boolean {
  const mode = useInboxMode();
  const { can } = usePermissions();
  return mode !== 'teacher' && can('inbox.lists');
}
