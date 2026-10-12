import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import type { Can } from '@/auth/use-permissions';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { roleOptionsQuery, userQuery } from './api';
import { backToUsers } from './nav';
import { UserEditor } from './UserEditor';

/** A user (users.read; the web's UserDetailDialog): loads the user and the role options, then the editor. */
export function UserDetailScreen({ can }: { can: Can }) {
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
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
        trailing={<Button variant="ghost" label={t.common.back} onPress={backToUsers} />}
      />
      {user.isError ? (
        <ErrorState onRetry={() => void user.refetch()} message={missing ? t.common.notFound : t.common.error} />
      ) : (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
      )}
    </Screen>
  );
}
