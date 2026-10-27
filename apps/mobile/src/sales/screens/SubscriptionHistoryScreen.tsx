import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { HistoryEntryCard } from '../components/HistoryEntryCard';
import { SalesLoadScreen } from '../components/SalesLoadScreen';
import { useSubscriptionHistory } from '../lib/sales-api';

/**
 * «سجل اشتراكات …» (web: «السجل» on «مؤكدة»): the student's subscriptions oldest first, the opened one
 * outlined. Only one of mine answers; anything else is a 404 «لم نجد ما تبحث عنه».
 */
export function SubscriptionHistoryScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const history = useSubscriptionHistory(id);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  const data = history.data;
  if (!data) return <SalesLoadScreen title={t.sales.history.open} query={history} notFound={t.common.notFound} />;
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
