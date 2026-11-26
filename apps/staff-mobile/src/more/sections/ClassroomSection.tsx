import type { Permission } from '@ab/catalog';
import { router } from 'expo-router';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';

/** Every staff login with meetings.read sees the meetings, sales included. */
export function ClassroomSection({
  can = () => true,
}: {
  can?: (permission: Permission) => boolean;
}) {
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
