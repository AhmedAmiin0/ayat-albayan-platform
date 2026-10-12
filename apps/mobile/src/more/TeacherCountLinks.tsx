import type { StudentListKind } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { KIND_LABEL } from '@/students/student-kinds';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import type { TeacherListItem } from './types';

const L = t.studentLists;

export interface TeacherCountLinksProps {
  teacher: TeacherListItem;
  /** The teacher's name as the row shows it, for the spoken label of each count. */
  name: string;
}

/**
 * «مشترك n · تجريبي n» of a teacher row, each count its own 44pt button: it opens the teacher's file
 * on that list (`?status=active|trial`). Beside the row's own button, never inside it, so a screen
 * reader reaches both.
 */
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
