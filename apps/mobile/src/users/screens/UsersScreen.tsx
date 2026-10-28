import type { UserView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { FIRST_VIEW, USERS_PAGE_SIZE, type UsersView } from '../shared/api';
import { backToMore } from '../shared/nav';
import { UserItem } from '../list/UserItem';
import { UsersFilters } from '../list/UsersFilters';

const keyOf = (u: UserView) => u.id;
const openUser = (id: string) => router.push(`/more/users/${id}`);
const renderRow = ({ item }: { item: UserView }) => <UserItem user={item} onOpen={openUser} />;

/**
 * «المستخدمون» (users.read), the web's /admin/users: every login with its role, linked record and
 * status; search, role and status filters, 20 a page (more load on scroll). «مستخدم جديد» and
 * every action in a user need users.write. The list screens' compact top (owner 2026-10-28): «المستخدمون
 * · 120» on the title's line, «مستخدم جديد» a pill beside «رجوع», the pill search, the filters, 8pt apart.
 */
export function UsersScreen({ can }: { can: Can }) {
  const { color } = useTheme();
  const [view, setView] = useState<UsersView>(FIRST_VIEW);
  const list = usePagedList<UserView>({ path: '/users', params: { ...view }, pageSize: USERS_PAGE_SIZE });
  return (
    <Screen list>
      <ScreenHeader
        title={t.users.title}
        size="h2"
        connecting
        count={list.data ? list.total : undefined}
        trailing={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {can('users.write') ? <PillButton label={t.users.new} onPress={() => router.push('/more/users/new')} /> : null}
            <Button variant="ghost" label={t.common.back} onPress={backToMore} />
          </View>
        }
      />
      <SearchField compact label={t.users.searchPlaceholder} onSearch={(q) => setView((v) => ({ ...v, q }))} />
      <UsersFilters view={view} onChange={setView} />
      <LazyList
        paged={list}
        testID="users-list"
        keyExtractor={keyOf}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.users.empty} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
