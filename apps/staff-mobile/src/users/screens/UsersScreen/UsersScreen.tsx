import type { UserView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  t,
  useTheme,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import { FIRST_VIEW, USERS_PAGE_SIZE } from '@/users/shared/api';
import { backToMore } from '@/users/shared/nav';
import { UserItem } from '@/users/list/UserItem';
import { UsersFilters } from '@/users/list/UsersFilters';
import { StaffPresenceSection } from '@/users/presence/StaffPresenceSection';
import type { UsersView } from '@ab/client-core';

const keyOf = (u: UserView) => u.id;
const openUser = (id: string) => router.push(`/more/users/${id}`);
const renderRow = ({ item }: { item: UserView }) => <UserItem user={item} onOpen={openUser} />;

/** Needs users.read; creating and every user action need users.write; 20 per page. */
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
        leading={<BackButton onPress={backToMore} />}
        trailing={
          can('users.write') ? (
            <PillButton label={t.users.new} onPress={() => router.push('/more/users/new')} />
          ) : undefined
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
        ListHeaderComponent={<StaffPresenceSection />}
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
