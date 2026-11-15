import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, Avatar, Chevron, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import { NewMark, StudentIdentity } from '@/ui';
import { childHref } from '@/nav';

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
      <StudentIdentity student={student} />
      {newReports > 0 ? <NewMark /> : null}
      <Chevron to="next" color={color.ink2} />
    </Pressable>
  );
}
