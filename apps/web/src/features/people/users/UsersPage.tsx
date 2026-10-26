import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { Toast } from '@/components/ui/overlay/toast';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { t } from '@/lib/i18n/i18n';
import { userListQuery, type UsersView } from './api';
import { CreateUserDialog } from './create/CreateUserDialog';
import { UserDetailDialog } from './edit/UserDetailDialog';
import { usersColumns } from './usersColumns';
import { UsersSearch } from './UsersSearch';
import { usersFilters } from './use-users-filters';

const FIRST: UsersView = { q: '', role: '', status: '', page: 1 };

/**
 * «المستخدمون» (users.read): every login with its role, linked record and status; search, role and
 * status filters, server paging. «مستخدم جديد» and the panel's actions need users.write.
 */
export function UsersPage() {
  const { can } = usePermissions();
  const canWrite = can('users.write');
  const [view, setView] = useState<UsersView>(FIRST);
  const [opened, setOpened] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, isError } = useQuery(userListQuery(view));
  const columns = useMemo(() => usersColumns(setOpened), []);
  const search = useCallback((q: string) => setView((v) => ({ ...v, q, page: 1 })), []);
  const done = (message: string) => {
    setOpened(null);
    setNotice(message);
  };

  return (
    <>
      <PageHead>
        <Cartouche>{t.users.title}</Cartouche>
        {data && <span className="text-sm text-ink-3 tabular-nums">{t.users.count.replace('{n}', String(data.total))}</span>}
        {canWrite && (
          <div className="ms-auto flex gap-2.5 max-sm:w-full max-sm:[&>*]:flex-1">
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" />
              {t.users.new}
            </Button>
          </div>
        )}
      </PageHead>
      {isError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {t.common.error}
        </p>
      )}
      <DataTable
        fill
        stacked
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        onRowClick={(r) => setOpened(r.id)}
        emptyText={data ? t.users.empty : t.common.loading}
        label={t.users.title}
        toolbar={{ search: <UsersSearch initial={view.q} onSearch={search} />, extra: usersFilters(view, setView), total: data?.total }}
      />
      {data && <Pager page={view.page} total={data.total} pageSize={data.pageSize} onPage={(page) => setView({ ...view, page })} />}
      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
      {opened && <UserDetailDialog userId={opened} canWrite={canWrite} onClose={() => setOpened(null)} onDone={done} />}
      {notice && <Toast key={notice} message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
