import type { Permission } from '@ab/catalog';
import { router } from 'expo-router';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';

/**
 * «الحلقات والاجتماعات»: the live lessons board and the meetings (web parity). Every staff login
 * holding meetings.read sees the meetings, a salesperson included (owner 2026-10-12).
 */
export function ClassroomSection({ can = () => true }: { can?: (permission: Permission) => boolean }) {
  return (
    <Section title={t.mobileClassroom.section}>
      <InsetGroup>
        {can('lessons.read') && (
          <ListRow title={t.mobileClassroom.title} onPress={() => router.push('/more/live')} />
        )}
        {can('meetings.read') && (
          <ListRow title={t.mobileClassroom.meetingsRow} onPress={() => router.push('/more/live/meetings')} />
        )}
      </InsetGroup>
    </Section>
  );
}
