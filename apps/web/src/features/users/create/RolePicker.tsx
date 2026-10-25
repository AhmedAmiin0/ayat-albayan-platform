import { USER_ROLES, type UserRole, type UserRoleOption } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { roleName } from '@/features/roles/api';
import { t } from '@/lib/i18n/i18n';

const F = t.users.form;

export interface RolePickerProps {
  role: UserRole;
  roleId: string;
  options: readonly UserRoleOption[];
  onChange: (next: { role: UserRole; roleId: string }) => void;
  disabled?: boolean;
  hint?: string | undefined;
}

/** Base role, then a role of that base role: custom ones only, «الدور الافتراضي» when none is picked. */
export function RolePicker({ role, roleId, options, onChange, disabled, hint }: RolePickerProps) {
  const custom = options.filter((o) => o.base_role === role && !o.is_system);
  const locked = (r: UserRole) => options.some((o) => o.base_role === r && o.is_system && !o.assignable);
  return (
    <>
      <Field label={F.role} hint={hint}>
        {(p) => (
          <Select {...p} value={role} disabled={disabled} onChange={(e) => onChange({ role: USER_ROLES.find((r) => r === e.target.value) ?? role, roleId: '' })}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r} disabled={locked(r) && r !== role}>
                {t.activity.roles[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {custom.length > 0 && (
        <Field label={F.customRole}>
          {(p) => (
            <Select {...p} value={roleId} disabled={disabled} onChange={(e) => onChange({ role, roleId: e.target.value })}>
              <option value="">{F.defaultRole}</option>
              {custom.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.assignable && o.id !== roleId}>
                  {o.assignable ? roleName(o) : F.notAssignable.replace('{name}', roleName(o))}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
    </>
  );
}
