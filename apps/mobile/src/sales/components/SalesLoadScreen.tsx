import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';

interface SalesLoadScreenProps {
  title: string;
  query: { isError: boolean; error: unknown; refetch: () => unknown };
  /** What a 404 says (not hers, or gone). */
  notFound: string;
}

/** A sales detail page before its data: the spinner, then the 404 words or the load error, each with «رجوع». */
export function SalesLoadScreen({ title, query, notFound }: SalesLoadScreenProps) {
  const { color } = useTheme();
  const missing = query.error instanceof ApiError && query.error.status === 404;
  return (
    <Screen>
      <ScreenHeader title={title} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      {query.isError ? (
        <ErrorState message={missing ? notFound : t.sales.loadFailed} onRetry={() => void query.refetch()} />
      ) : (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
      )}
    </Screen>
  );
}
