import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { HistoryEntryCard } from './HistoryEntryCard';
import { useSubscriptionHistory } from './sales-api';

/**
 * «سجل اشتراكات …» (web: «السجل» on «مؤكدة»): the student's subscriptions oldest first, the opened one
 * outlined. Only one of mine answers; anything else is a 404 «لم نجد ما تبحث عنه».
 */
export function SubscriptionHistoryScreen() {
  const { color } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const history = useSubscriptionHistory(id);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  const data = history.data;
  if (!data) {
    const missing = history.error instanceof ApiError && history.error.status === 404;
    return (
      <Screen>
        <ScreenHeader title={t.sales.history.open} trailing={back} />
        {history.isError ? (
          <ErrorState message={missing ? t.common.notFound : t.sales.loadFailed} onRetry={() => void history.refetch()} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
        )}
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.history.title.replace('{name}', data.student.name)}
        subtitle={ltr(data.student.code)}
        trailing={back}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 12 }}>
          {data.subscriptions.map((entry) => (
            <HistoryEntryCard key={entry.id} entry={entry} current={entry.id === data.subscription_id} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
