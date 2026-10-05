import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';
import { rolesQuery, staffUsersQuery, type RoleView } from './api';
import { RoleDialog } from './RoleDialog';
import { RolesList } from './RolesList';
import { UsersList } from './UsersList';

const P = t.permissions.page;

/**
 * «الأدوار والصلاحيات» (owner, 2026-10-05): roles with their permission matrix, and the staff users
 * with the role each holds. Needs roles.manage (the API checks it on every call too).
 */
export function RolesPage() {
  const roles = useQuery(rolesQuery);
  const users = useQuery(staffUsersQuery);
  // undefined = closed, null = a new role.
  const [editing, setEditing] = useState<RoleView | null | undefined>(undefined);
  return (
    <>
      <PageHead>
        <Cartouche>{P.title}</Cartouche>
        <Button type="button" className="ms-auto" onClick={() => setEditing(null)}>
          {P.newRole}
        </Button>
      </PageHead>
      {(roles.isError || users.isError) && <p role="alert">{t.common.error}</p>}
      {roles.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      <section aria-labelledby="roles-heading" className="grid gap-3">
        <h2 id="roles-heading" className="text-base font-bold text-ink">{P.roles}</h2>
        {roles.data && <RolesList roles={roles.data} onEdit={setEditing} />}
      </section>
      <section aria-labelledby="users-heading" className="mt-8 grid gap-3">
        <h2 id="users-heading" className="text-base font-bold text-ink">{P.users}</h2>
        {users.data && roles.data && <UsersList users={users.data} roles={roles.data} />}
      </section>
      {editing !== undefined && <RoleDialog role={editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}
