import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Select } from '@/components/ui/form/select';
import { apiErrorText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { assignRole, roleName, ROLES_KEY, type RoleView, type StaffUserView } from './api';

const P = t.permissions.page;
const TH = 'px-3 py-2 text-start text-xs font-semibold text-ink-3';

/** «المستخدمون»: every staff profile with a role selector (assigning sets their base role too). */
export function UsersList({ users, roles }: { users: readonly StaffUserView[]; roles: readonly RoleView[] }) {
  const queryClient = useQueryClient();
  const assign = useMutation({
    mutationFn: assignRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
  const choices = roles.filter((r) => r.base_role !== 'guardian' && r.base_role !== 'student');
  if (users.length === 0) return <p className="text-sm text-ink-3">{P.empty}</p>;
  return (
    <div className="grid gap-3">
      {assign.isError && <FormAlert>{apiErrorText(assign.error, { ...P.errors })}</FormAlert>}
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{P.users}</caption>
        <thead>
          <tr className="border-b border-rule">
            <th className={TH}>{P.name}</th>
            <th className={TH}>{P.role}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-rule last:border-0">
              <td className="px-3 py-2 font-semibold text-ink">{user.full_name}</td>
              <td className="px-3 py-2">
                <Select
                  aria-label={`${P.role}: ${user.full_name}`}
                  value={user.role_id}
                  disabled={assign.isPending}
                  onChange={(e) => assign.mutate({ userId: user.id, roleId: e.target.value })}
                  className="max-w-64"
                >
                  {choices.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleName(r)}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
