import { Pressable } from 'react-native';
import { AppText, Avatar, Chevron, t, type, useTheme } from '@ab/mobile-kit';
import { openChildSwitch } from '@/nav/switch-store';
import type { ChildSwitchLinkProps } from './ChildSwitchLink.types';

/**
 * Under a tab's title (canvas SwitchReports): the child in view, its avatar, name and a chevron as
 * one button that opens the children sheet. Only for a guardian of several children.
 */
export function ChildSwitchLink({ student }: ChildSwitchLinkProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.portal.app.pick.open.replace('{name}', student.name)}
      onPress={openChildSwitch}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar name={student.name} id={student.id} size="sm" decorative />
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {student.name}
      </AppText>
      <Chevron to="down" color={color.ink2} />
    </Pressable>
  );
}
