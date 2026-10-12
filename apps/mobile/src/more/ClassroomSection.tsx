import type { Permission } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

/**
 * «الحلقات والاجتماعات»: the live lessons board and the internal meetings (web parity). A salesperson
 * (self.sales) has no meetings page (owner 2026-10-12), like the web sales nav.
 */
export function ClassroomSection({ can = () => true }: { can?: (permission: Permission) => boolean }) {
  return (
    <Section title={t.mobileClassroom.section}>
      <View style={{ marginHorizontal: -16 }}>
        {can('lessons.read') && (
          <ListRow title={t.mobileClassroom.title} onPress={() => router.push('/more/live')} />
        )}
        {can('meetings.read') && !can('self.sales') && (
          <ListRow title={t.mobileClassroom.meetingsRow} onPress={() => router.push('/more/live/meetings')} />
        )}
      </View>
    </Section>
  );
}
