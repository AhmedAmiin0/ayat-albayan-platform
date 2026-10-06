import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

/** «المالية» on «المزيد»: the three money lists that mirror the web's admin pages. */
export function MoneySection() {
  return (
    <Section title={t.mobileMoney.section}>
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={t.mobileMoney.receivablesTitle} onPress={() => router.push('/more/money/receivables')} />
        <ListRow title={t.mobileMoney.subscriptionsTitle} onPress={() => router.push('/more/money/subscriptions')} />
        <ListRow title={t.mobileMoney.paymentsTitle} onPress={() => router.push('/more/money/payments')} />
      </View>
    </Section>
  );
}
