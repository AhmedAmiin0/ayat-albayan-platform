import { memo } from 'react';
import { teacherName, teacherStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { TeacherCountLinks } from './TeacherCountLinks';
import type { TeacherListItem } from '../types';

/**
 * One teacher in «المعلمين»: the name and status open the teacher's file (on «مشترك»); the two counts
 * beside them open it on that list. Two sibling buttons, never one inside the other. The list's inset
 * card draws the fill and the rule between rows (owner 2026-10-28: one container rule).
 */
export const TeacherRow = memo(function TeacherRow({ teacher }: { teacher: TeacherListItem }) {
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
