import { familyChildren } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { useFamilyPick, usePortalMe } from '@/portal';
import { ChildSwitchRow } from './ChildSwitchRow';
import { useSwitchChild } from './use-switch-child';

/** The guardian's own row first; a row switches to that child and closes the sheet. */
export function ChildSwitchList() {
  const { color } = useTheme();
  const me = usePortalMe().data;
  const pick = useFamilyPick();
  const switchTo = useSwitchChild(me?.kind ?? 'guardian');
  if (!me) return null;
  const currentId = pick.state === 'one' ? pick.student.id : null;
  return (
    <View style={{ gap: 12 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}
      >
        {t.portal.app.pick.title}
      </AppText>
      <InsetGroup>
        {familyChildren(me).map((student) => (
          <ChildSwitchRow
            key={student.id}
            student={student}
            kind={me.kind}
            current={student.id === currentId}
            onPress={() => switchTo(student)}
          />
        ))}
      </InsetGroup>
    </View>
  );
}
