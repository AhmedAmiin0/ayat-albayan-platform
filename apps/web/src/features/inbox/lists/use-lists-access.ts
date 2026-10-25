import { usePermissions } from '@/features/auth/use-permissions';
import { useInboxMode } from '../shared/mode';

/** «القوائم» shows with inbox.lists, never in teacher mode (owner 2026-10-20: teachers get no lists). */
export function useListsAccess(): boolean {
  const mode = useInboxMode();
  const { can } = usePermissions();
  return mode !== 'teacher' && can('inbox.lists');
}
