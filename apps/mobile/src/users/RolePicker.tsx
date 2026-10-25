import { USER_ROLES, type UserRole, type UserRoleOption } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Choice } from './Choice';
import { roleOptionName, roleText } from './format';

export interface RolePickerProps {
  role: UserRole;
  roleId: string;
  options: readonly UserRoleOption[];
  onChange: (next: { role: UserRole; roleId: string }) => void;
  disabled?: boolean;
  hint?: string | undefined;
}

/**
 * The web's RolePicker: base role, then a role of that base role (custom ones only, «الدور
 * الافتراضي» when none is picked). A role the actor cannot grant is shown but not choosable.
 */
export function RolePicker({ role, roleId, options, onChange, disabled = false, hint }: RolePickerProps) {
  const F = t.users.form;
  const custom = options.filter((o) => o.base_role === role && !o.is_system);
  const locked = (r: UserRole) => options.some((o) => o.base_role === r && o.is_system && !o.assignable);
  const bases = USER_ROLES.map((r) => ({ value: r, label: roleText(r), disabled: disabled || (locked(r) && r !== role) }));
  const roles = [
    { value: '', label: F.defaultRole, disabled },
    ...custom.map((o) => ({
      value: o.id,
      label: o.assignable ? roleOptionName(o) : F.notAssignable.replace('{name}', roleOptionName(o)),
      disabled: disabled || (!o.assignable && o.id !== roleId),
    })),
  ];
  return (
    <>
      <Choice label={F.role} items={bases} value={role} onChange={(next) => onChange({ role: next, roleId: '' })} />
      {hint ? <Note>{hint}</Note> : null}
      {custom.length > 0 ? (
        <Choice label={F.customRole} items={roles} value={roleId} onChange={(next) => onChange({ role, roleId: next })} />
      ) : null}
    </>
  );
}
