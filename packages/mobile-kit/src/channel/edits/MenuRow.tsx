import type { ComponentType } from 'react';
import { Pressable } from 'react-native';
import type { ChatIconProps } from '../../chat-ui/icons/icon-line';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';

interface MenuRowProps {
  label: string;
  Icon: ComponentType<ChatIconProps>;
  danger?: boolean;
  onPress: () => void;
}

/** One row of the message menu (ChatXMenu): 48pt, a 20pt icon, then its word at 15/500. */
export function MenuRow({ label, Icon, danger = false, onPress }: MenuRowProps) {
  const { color } = useTheme();
  const ink = danger ? color.bad : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <Icon color={ink} size={20} />
      <AppText style={{ fontFamily: type.ui[500], fontSize: 15, color: ink }}>{label}</AppText>
    </Pressable>
  );
}
