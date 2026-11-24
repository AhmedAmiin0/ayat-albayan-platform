import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { Pager } from '@ab/web-kit/components/ui/layout/pager';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { StaffPresencePanel } from '@/features/platform/presence';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { userListQuery, type UsersPageView } from '@/features/people/users/api';
import { CreateUserDialog } from '@/features/people/users/create/CreateUserDialog';
import { UserDetailDialog } from '@/features/people/users/edit/UserDetailDialog';
import { usersColumns } from '@/features/people/users/usersColumns';
import { UsersSearch } from '@/features/people/users/UsersSearch';
import { usersFilters } from '@/features/people/users/use-users-filters';

const FIRST: UsersPageView = { q: '', role: '', status: '', page: 1 };

/** Needs users.read; creating and panel actions need users.write. */
export function UsersPage() {
  const { can } = usePermissions();
  const canWrite = can('users.write');
  const [view, setView] = useState<UsersPageView>(FIRST);
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
      <StaffPresencePanel />
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
