import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

/** «الإدارة»: the web admin screens that fit a phone: overview, academy settings, activity log. */
export function AdminOpsSection() {
  const rows = t.mobileAdmin.rows;
  return (
    <Section title={t.mobileAdmin.section}>
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={rows.dashboard} onPress={() => router.push('/more/ops/dashboard')} />
        <ListRow title={rows.settings} onPress={() => router.push('/more/ops/settings')} />
        <ListRow title={rows.activity} onPress={() => router.push('/more/ops/activity')} />
      </View>
    </Section>
  );
}
