import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

const rows = () =>
  [
    { route: 'dashboard', title: t.mobileAdmin.rows.dashboard, href: '/more/ops/dashboard' },
    { route: 'settings', title: t.mobileAdmin.rows.settings, href: '/more/ops/settings' },
    { route: 'activity', title: t.mobileAdmin.rows.activity, href: '/more/ops/activity' },
  ] as const;

/** «الإدارة»: the web admin screens that fit a phone: overview, academy settings, activity log (by permission). */
export function AdminOpsSection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileAdmin.section}>
      <View style={{ marginHorizontal: -16 }}>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
    </Section>
  );
}
