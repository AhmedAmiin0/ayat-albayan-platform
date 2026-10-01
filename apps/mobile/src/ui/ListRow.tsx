import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { type, useTheme } from '@/theme';
import { Ltr } from './Ltr';

export interface ListRowProps {
  /** Arabic name, one line. */
  title: string;
  /** Second line (last message, teacher, program…), one line. */
  subtitle?: string;
  /** LTR value beside the title: «AB-0183» or formatPhoneDisplay(phone). */
  meta?: string;
  /** At the inline-end, usually a <StatusChip>. */
  trailing?: ReactNode;
  /** Makes the row a button (opens the detail). Without it the row is plain text. */
  onPress?: () => void;
}

/** One list row, 56pt minimum, hairline below. Feed it to FlatList renderItem. */
export function ListRow({ title, subtitle, meta, trailing, onPress }: ListRowProps) {
  const { color } = useTheme();
  const row: ViewStyle = {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
    backgroundColor: color.raised,
  };
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: type.ui[600],
              fontSize: type.size.body,
              lineHeight: type.lineHeight(type.size.body),
              color: color.ink,
            }}
          >
            {title}
          </Text>
          {meta ? (
            <Ltr
              style={{ fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 }}
            >
              {meta}
            </Ltr>
          ) : null}
        </View>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: type.ui[400],
              fontSize: type.size.xs,
              lineHeight: type.lineHeight(type.size.xs),
              color: color.ink2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  if (!onPress) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [row, pressed ? { backgroundColor: color.sunk } : null]}
    >
      {body}
    </Pressable>
  );
}
