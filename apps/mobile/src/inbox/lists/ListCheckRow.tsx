import type { ChatList } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

export interface ListCheckRowProps {
  list: ChatList;
  /** This chat is in the list. */
  checked: boolean;
  onToggle: () => void;
}

/** One list in a chat's «القوائم» checklist: a 44pt checkbox row, its name and how many chats. */
export function ListCheckRow({ list, checked, onToggle }: ListCheckRowProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={list.name}
      onPress={onToggle}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 6,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: shape.radius.sm,
          borderWidth: 1.5,
          borderColor: checked ? color.lapisFill : color.ruleInput,
          backgroundColor: checked ? color.lapisFill : color.raised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <View style={{ width: 10, height: 10, borderRadius: shape.radius.xs, backgroundColor: color.onLapis }} /> : null}
      </View>
      <AppText
        numberOfLines={1}
        style={{ flex: 1, fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
      >
        {list.name}
      </AppText>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3, fontVariant: ['tabular-nums'] }}>
        {t.inbox.lists.count.replace('{n}', String(list.count))}
      </AppText>
    </Pressable>
  );
}
