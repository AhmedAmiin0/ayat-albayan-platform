import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { baseRoleLabel, roleName, type RoleView } from './api';

const P = t.permissions.page;
const TH = 'px-3 py-2 text-start text-xs font-semibold text-ink-3';
const TD = 'px-3 py-2 align-middle';

/** «الأدوار»: system roles first (marked), then custom ones; each opens the side panel. */
export function RolesList({ roles, onEdit }: { roles: readonly RoleView[]; onEdit: (role: RoleView) => void }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{P.roles}</caption>
      <thead>
        <tr className="border-b border-rule">
          <th className={TH}>{P.name}</th>
          <th className={TH}>{P.baseRole}</th>
          <th className={TH}>{P.permissions}</th>
          <th className={TH}>{P.users}</th>
          <th className={TH}>
            <span className="sr-only">{P.edit}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr key={role.id} className="border-b border-rule last:border-0">
            <td className={TD}>
              <span className="font-semibold text-ink">{roleName(role)}</span>{' '}
              <span className="text-2xs text-ink-3">{role.is_system ? P.system : P.custom}</span>
            </td>
            <td className={TD}>{baseRoleLabel(role.base_role)}</td>
            <td className={`${TD} tabular-nums`}>{P.permissionsCount.replace('{n}', String(role.permissions.length))}</td>
            <td className={`${TD} tabular-nums`}>{P.usersCount.replace('{n}', String(role.users))}</td>
            <td className={`${TD} text-end`}>
              <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(role)} aria-label={`${P.edit} ${roleName(role)}`}>
                {P.edit}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
