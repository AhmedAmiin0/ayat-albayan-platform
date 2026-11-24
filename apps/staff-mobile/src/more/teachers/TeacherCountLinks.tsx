import type { StudentListKind, TeacherListRow } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { KIND_LABEL } from '@/students/list/student-kinds';

const L = t.studentLists;

interface TeacherCountLinksProps {
  teacher: TeacherListRow;
  /** The teacher's name as the row shows it, for the spoken label of each count. */
  name: string;
}

/** Each count is a sibling button, never inside the row's, so a screen reader reaches both. */
export function TeacherCountLinks({ teacher, name }: TeacherCountLinksProps) {
  const { color } = useTheme();
  const items: { kind: Exclude<StudentListKind, 'all'>; n: number; label: string }[] = [
    { kind: 'active', n: teacher.active_count, label: L.activeLink },
    { kind: 'trial', n: teacher.trial_count, label: L.trialLink },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {items.map(({ kind, n, label }) => (
        <Pressable
          key={kind}
          accessibilityRole="button"
          accessibilityLabel={label.replace('{name}', name).replace('{n}', String(n))}
          onPress={() => router.push(`/more/teachers/${teacher.id}?status=${kind}`)}
          style={({ pressed }) => ({
            minHeight: shape.control.touch,
            minWidth: shape.control.touch,
            paddingHorizontal: 10,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: shape.radius.md,
            backgroundColor: pressed ? color.lapisWash : 'transparent',
          })}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis, fontVariant: ['tabular-nums'] }}>
            {`${KIND_LABEL[kind]} ${n}`}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
