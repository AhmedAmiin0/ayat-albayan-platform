import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, InsetGroup, ListRow, t, type, useTheme } from '@ab/mobile-kit';
import { childHref } from '@/nav';

/** «الأبناء» on a guardian's account: each child → their page. */
export function ChildrenLinks({ students }: { students: readonly PortalStudent[] }) {
  const { color } = useTheme();
  if (students.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}>
        {t.portal.app.account.children}
      </AppText>
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
    </View>
  );
}
