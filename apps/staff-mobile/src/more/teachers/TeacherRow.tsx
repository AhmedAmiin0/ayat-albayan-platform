import { memo } from 'react';
import { teacherName, teacherStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t, locale, type, useTheme, AppText, StatusChip, Avatar } from '@ab/mobile-kit';
import { TeacherCountLinks } from './TeacherCountLinks';
import type { TeacherListRow } from '@ab/shared';

/** Two sibling buttons, never nested. */
export const TeacherRow = memo(function TeacherRow({ teacher }: { teacher: TeacherListRow }) {
  const { color } = useTheme();
  const name = teacherName(teacher, locale);
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
      }}
    >
      <Avatar name={name} id={teacher.id} src={teacher.avatar_url} decorative />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/more/teachers/${teacher.id}`)}
        style={({ pressed }) => ({ flex: 1, gap: 4, paddingVertical: 10, alignItems: 'flex-start', opacity: pressed ? 0.7 : 1 })}
      >
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
        >
          {name}
        </AppText>
        <StatusChip {...teacherStatusStyle[teacher.status]} size="sm" label={t.enums.teacherStatus[teacher.status]} />
      </Pressable>
      <TeacherCountLinks teacher={teacher} name={name} />
    </View>
  );
});
