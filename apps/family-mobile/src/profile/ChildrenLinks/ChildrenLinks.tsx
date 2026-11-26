import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { Avatar, InsetGroup, ListRow, Section, t } from '@ab/mobile-kit';
import { childHref } from '@/nav';

export function ChildrenLinks({ students }: { students: readonly PortalStudent[] }) {
  if (students.length === 0) return null;
  return (
    <Section title={t.portal.app.account.children}>
      <InsetGroup>
        {students.map((s) => (
          <ListRow
            key={s.id}
            leading={<Avatar name={s.name} id={s.id} size="sm" decorative />}
            title={s.name}
            meta={s.code}
            onPress={() => router.push(childHref(s.id))}
          />
        ))}
      </InsetGroup>
    </Section>
  );
}
