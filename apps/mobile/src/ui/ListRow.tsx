import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { type, useTheme } from '@/theme';
import { Ltr } from './Ltr';
import { AppText } from './AppText';

export interface ListRowProps {
  /** At the inline-start, usually an <Avatar>. */
  leading?: ReactNode;
  /** Arabic name, one line. */
  title: string;
  /** Second line (last message, teacher, program…), one line. */
  subtitle?: string;
  /** Before the subtitle on its line: a thread's delivery ticks when its last message is ours. */
  subtitleLeading?: ReactNode;
  /** What the reader says for the subtitle when it differs (the ticks' status word, then the text). */
  subtitleLabel?: string;
  /** LTR value beside the title: «AB-0183» or formatPhone(phone). */
  meta?: string;
  /** Third line: chips and short words that wrap (a thread's lead status + source). */
  tags?: ReactNode;
  /** At the inline-end, usually a <StatusChip>. At most 45 % of the row: a long word ellipsizes. */
  trailing?: ReactNode;
  /** Makes the row a button (opens the detail). Without it the row is plain text. */
  onPress?: () => void;
}

/** One list row, 56pt minimum, hairline below. Feed it to FlatList renderItem. */
export function ListRow(props: ListRowProps) {
  const { leading, title, subtitle, subtitleLeading, subtitleLabel, meta, tags, trailing, onPress } = props;
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
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText
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
          </AppText>
          {meta ? (
            <Ltr
              style={{ fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 }}
            >
              {meta}
            </Ltr>
          ) : null}
        </View>
        {subtitle ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {subtitleLeading}
            <AppText
              numberOfLines={1}
              accessibilityLabel={subtitleLabel}
              style={{
                flexShrink: 1,
                fontFamily: type.ui[400],
                fontSize: type.size.xs,
                lineHeight: type.lineHeight(type.size.xs),
                color: color.ink2,
                fontVariant: ['tabular-nums'],
              }}
            >
              {subtitle}
            </AppText>
          </View>
        ) : null}
        {tags ? (
          <View
            testID="list-row-tags"
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 }}
          >
            {tags}
          </View>
        ) : null}
      </View>
      {/* RN items don't shrink by default: uncapped, a long chip word squeezes the name to «…». */}
      {trailing ? (
        <View testID="list-row-trailing" style={{ flexShrink: 1, maxWidth: '45%' }}>
          {trailing}
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [row, pressed ? { backgroundColor: color.sunk, opacity: 0.85 } : null]}
    >
      {body}
    </Pressable>
  );
}
