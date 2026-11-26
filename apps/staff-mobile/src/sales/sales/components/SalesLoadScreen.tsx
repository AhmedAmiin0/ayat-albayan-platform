import { router } from 'expo-router';
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

interface SalesLoadScreenProps {
  title: string;
  query: { isError: boolean; error: unknown; refetch: () => unknown };
  /** What a 404 says (not hers, or gone). */
  notFound: string;
}

export function SalesLoadScreen({ title, query, notFound }: SalesLoadScreenProps) {
  const { color } = useTheme();
  const missing = query.error instanceof ApiError && query.error.status === 404;
  return (
    <Screen>
      <ScreenHeader title={title} leading={<BackButton onPress={() => router.back()} />} />
      {query.isError ? (
        <ErrorState
          message={missing ? notFound : t.sales.loadFailed}
          onRetry={() => void query.refetch()}
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
