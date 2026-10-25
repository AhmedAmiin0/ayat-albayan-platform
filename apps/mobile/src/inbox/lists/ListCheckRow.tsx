import type { ChatList } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { AutoListChip } from './AutoListNote';

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
      accessibilityHint={list.auto_rule ? t.inbox.lists.autoRule[list.auto_rule] : undefined}
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
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText
            numberOfLines={1}
            style={{ flexShrink: 1, fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
          >
            {list.name}
          </AppText>
          {list.auto_rule ? <AutoListChip /> : null}
        </View>
        {list.auto_rule ? (
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 }}>
            {t.inbox.lists.autoRule[list.auto_rule]}
          </AppText>
        ) : null}
      </View>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3, fontVariant: ['tabular-nums'] }}>
        {t.inbox.lists.count.replace('{n}', String(list.count))}
      </AppText>
    </Pressable>
  );
}
