import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t, BackButton, ltr, Screen, ScreenHeader } from '@ab/mobile-kit';
import { HistoryEntryCard } from '@/sales/sales/components/HistoryEntryCard';
import { SalesLoadScreen } from '@/sales/sales/components/SalesLoadScreen';
import { useSubscriptionHistory } from '@/sales/sales/lib/sales-api';

/** Only one of mine answers; anything else is a 404. */
export function SubscriptionHistoryScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const history = useSubscriptionHistory(id);
  const back = <BackButton onPress={() => router.back()} />;
  const data = history.data;
  if (!data)
    return (
      <SalesLoadScreen title={t.sales.history.open} query={history} notFound={t.common.notFound} />
    );
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.history.title.replace('{name}', data.student.name)}
        subtitle={ltr(data.student.code)}
        leading={back}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 12 }}>
          {data.subscriptions.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              current={entry.id === data.subscription_id}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
