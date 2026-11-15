import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, Avatar, Chevron, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import { childHref } from '@/nav';
import { NewMark } from '@/lessons';

interface CardHeadProps {
  student: PortalStudent;
  /** Reports not opened on this phone. */
  newReports: number;
}

/**
 * A child card's head: avatar, name and code, «جديد» when a report waits; a press opens the
 * child's page (the card's lesson and join stay their own buttons).
 */
export function CardHead({ student, newReports }: CardHeadProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${student.name} ${student.code}`}
      accessibilityHint={t.portal.app.home.open.replace('{name}', student.name)}
      onPress={() => router.push(childHref(student.id))}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar name={student.name} id={student.id} decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}
        >
          {student.name}
        </AppText>
        <Ltr style={{ fontSize: type.size.xs, color: color.ink2 }}>{student.code}</Ltr>
      </View>
      {newReports > 0 ? <NewMark /> : null}
      <Chevron to="next" color={color.ink2} />
    </Pressable>
  );
}
