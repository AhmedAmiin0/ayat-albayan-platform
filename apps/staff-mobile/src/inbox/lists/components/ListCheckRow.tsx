import type { ChatList } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Checkbox } from '@ab/mobile-kit';
import { AutoListChip } from './AutoListNote';

interface ListCheckRowProps {
  list: ChatList;
  /** This chat is in the list. */
  checked: boolean;
  onToggle: () => void;
}

export function ListCheckRow({ list, checked, onToggle }: ListCheckRowProps) {
  const { color } = useTheme();
  return (
    <Checkbox
      label={list.name}
      hint={
        list.auto_rule
          ? `${t.inbox.lists.auto}. ${t.inbox.lists.autoRule[list.auto_rule]}`
          : undefined
      }
      checked={checked}
      onChange={onToggle}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontFamily: type.ui[500],
                fontSize: type.size.body,
                lineHeight: type.lineHeight(type.size.body),
                color: color.ink,
              }}
            >
              {list.name}
            </AppText>
            {list.auto_rule ? <AutoListChip /> : null}
          </View>
          {list.auto_rule ? (
            <AppText
              style={{
                fontFamily: type.ui[400],
                fontSize: type.size.xs,
                lineHeight: type.lineHeight(type.size.xs),
                color: color.ink3,
              }}
            >
              {t.inbox.lists.autoRule[list.auto_rule]}
            </AppText>
          ) : null}
        </View>
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            color: color.ink3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {t.inbox.lists.count.replace('{n}', String(list.count))}
        </AppText>
      </View>
    </Checkbox>
  );
}
