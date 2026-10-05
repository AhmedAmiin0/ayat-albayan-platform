import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermissions';
import { t } from '@/lib/i18n';
import { duplicateRole, ROLES_KEY, roleErrorText, rolesQuery, type RoleView } from './api';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { roleColumns } from './role-columns';
import type { RoleAction } from './RoleActions';
import { RoleEditor } from './RoleEditor';

type Open = { kind: 'edit'; role: RoleView | null } | { kind: 'delete'; role: RoleView } | null;
type Notice = { text: string; tone: 'info' | 'error' } | null;

/** «الأدوار والصلاحيات» (owner, 2026-10-05): system and custom roles, their permissions, who holds them. */
export function RolesPage() {
  const queryClient = useQueryClient();
  const roles = useQuery(rolesQuery);
  const { can } = usePermissions();
  const canManage = can('roles.manage');
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const copy = useMutation({
    mutationFn: duplicateRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      setNotice({ text: t.roles.toast.duplicated, tone: 'info' });
    },
    onError: (e) => setNotice({ text: roleErrorText(e), tone: 'error' }),
  });
  const onAction = (role: RoleView, action: RoleAction) => {
    if (action === 'edit') setOpen({ kind: 'edit', role });
    else if (action === 'delete') setOpen({ kind: 'delete', role });
    else copy.mutate({ id: role.id, names: { name_ar: t.roles.copyName.replace('{name}', role.name_ar), name_en: `${role.name_en} (copy)` } });
  };
  const done = (text: string) => {
    setOpen(null);
    setNotice({ text, tone: 'info' });
  };

  return (
    <>
      <PageHead>
        <Cartouche>{t.roles.title}</Cartouche>
        {canManage && (
          <Button type="button" className="ms-auto" onClick={() => setOpen({ kind: 'edit', role: null })}>
            {t.roles.newRole}
          </Button>
        )}
      </PageHead>
      <p className="mb-4 text-sm text-ink-2">{t.roles.intro}</p>
      {roles.isError && <p role="alert">{t.roles.state.error}</p>}
      {roles.isPending && <p className="text-sm text-ink-3">{t.roles.state.loading}</p>}
      {roles.data?.length === 0 && (
        <TableBox center>
          <EmptyState title={t.roles.state.empty} />
        </TableBox>
      )}
      {roles.data && roles.data.length > 0 && (
        <DataTable
          stacked
          label={t.roles.title}
          columns={roleColumns(onAction, canManage)}
          data={roles.data}
          getRowId={(r) => r.id}
          emptyText={t.common.notFound}
        />
      )}
      {open?.kind === 'edit' && <RoleEditor role={open.role} onClose={() => setOpen(null)} onSaved={done} />}
      {open?.kind === 'delete' && (
        <DeleteRoleDialog role={open.role} onClose={() => setOpen(null)} onDeleted={() => done(t.roles.toast.deleted)} />
      )}
      {notice && <Toast message={notice.text} tone={notice.tone} onDismiss={() => setNotice(null)} />}
    </>
  );
}
