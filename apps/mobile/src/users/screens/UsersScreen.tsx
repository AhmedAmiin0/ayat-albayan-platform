import type { UserView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { FIRST_VIEW, USERS_PAGE_SIZE, type UsersView } from '../shared/api';
import { backToMore } from '../shared/nav';
import { UserItem } from '../list/UserItem';
import { UsersFilters } from '../list/UsersFilters';

/**
 * «المستخدمون» (users.read), the web's /admin/users: every login with its role, linked record and
 * status; search, role and status filters, 20 a page (more load on scroll). «مستخدم جديد» and
 * every action in a user need users.write.
 */
export function UsersScreen({ can }: { can: Can }) {
  const { color } = useTheme();
  const [view, setView] = useState<UsersView>(FIRST_VIEW);
  const list = usePagedList<UserView>({ path: '/users', params: { ...view }, pageSize: USERS_PAGE_SIZE });
  const count = list.data ? t.users.count.replace('{n}', String(list.total)) : undefined;
  return (
    <Screen>
      <ScreenHeader
        title={t.users.title}
        subtitle={count}
        trailing={<Button variant="ghost" label={t.common.back} onPress={backToMore} />}
      />
      {can('users.write') ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button label={t.users.new} onPress={() => router.push('/more/users/new')} />
        </View>
      ) : null}
      <SearchField label={t.users.searchPlaceholder} onSearch={(q) => setView((v) => ({ ...v, q }))} />
      <UsersFilters view={view} onChange={setView} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        testID="users-list"
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserItem user={item} onPress={() => router.push(`/more/users/${item.id}`)} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
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
