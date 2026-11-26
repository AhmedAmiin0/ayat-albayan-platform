import { View } from 'react-native';
import { AppText, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { ChildSwitchRow } from '@/switch/ChildSwitchRow';
import { useChildSwitchList } from './use-child-switch-list';

/** The guardian's own row first; a row switches to that child and closes the sheet. */
export function ChildSwitchList() {
  const { color } = useTheme();
  const { loaded, students, kind, currentId, switchTo } = useChildSwitchList();
  if (!loaded) return null;
  return (
    <View style={{ gap: 12 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}
      >
        {t.portal.app.pick.title}
      </AppText>
      <InsetGroup>
        {students.map((student) => (
          <ChildSwitchRow
            key={student.id}
            student={student}
            kind={kind}
            current={student.id === currentId}
            onPress={() => switchTo(student)}
          />
        ))}
      </InsetGroup>
    </View>
  );
}
