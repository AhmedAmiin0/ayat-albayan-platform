import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { RoleView } from './api';

export type RoleAction = 'edit' | 'duplicate' | 'delete';

export interface RoleActionsProps {
  role: RoleView;
  onAction: (role: RoleView, action: RoleAction) => void;
  /** Without roles.manage the screen is a read-only list. */
  canManage: boolean;
}

/** One role's row actions. System roles have no delete; the others open the blocked-or-confirm dialog. */
export function RoleActions({ role, onAction, canManage }: RoleActionsProps) {
  const name = role.name_ar;
  return (
    <span className="flex flex-wrap gap-1.5">
      <Button type="button" variant="secondary" size="sm" aria-label={t.roles.action.editRole.replace('{name}', name)} onClick={() => onAction(role, 'edit')}>
        {canManage ? t.common.edit : t.roles.matrix.heading}
      </Button>
      {canManage && (
        <Button type="button" variant="ghost" size="sm" aria-label={t.roles.action.duplicateRole.replace('{name}', name)} onClick={() => onAction(role, 'duplicate')}>
          {t.roles.action.duplicate}
        </Button>
      )}
      {canManage && !role.is_system && (
        <Button type="button" variant="danger-quiet" size="sm" aria-label={t.roles.action.deleteRole.replace('{name}', name)} onClick={() => onAction(role, 'delete')}>
          {t.common.delete}
        </Button>
      )}
    </span>
  );
}
