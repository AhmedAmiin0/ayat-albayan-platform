import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import {
  ApiError,
  t,
  useTheme,
  BackButton,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';
import { roleOptionsQuery, userQuery } from '@/users/shared/api';
import { backToUsers } from '@/users/shared/nav';
import { UserEditor } from '@/users/edit/UserEditor';

/** A user (users.read; web UserDetailDialog): loads the user and role options, then the editor. */
export function UserDetailScreen({ can }: { can: Can }) {
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const user = useQuery(userQuery(id));
  const options = useQuery(roleOptionsQuery);
  if (user.data && !options.isPending) {
    return <UserEditor key={user.data.id} user={user.data} options={options.data ?? []} canWrite={can('users.write')} />;
  }
  const missing = user.error instanceof ApiError && user.error.status === 404;
  return (
    <Screen>
      <ScreenHeader
        title={t.users.detail.title}
        leading={<BackButton onPress={backToUsers} />}
      />
      {user.isError ? (
        <ErrorState
          onRetry={() => void user.refetch()}
          message={missing ? t.common.notFound : t.common.error}
        />
      ) : (
        <ActivityIndicator
          accessibilityLabel={t.common.loading}
          color={color.lapis}
          style={{ paddingVertical: 32 }}
        />
      )}
    </Screen>
  );
}
