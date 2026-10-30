import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { type, useTheme } from '@/theme';
import { useInset } from '../surface/inset';
import { ListRowTitle, type TitleLink } from '@/core/ui/lists/ListRowTitle';
import { AppText } from '../primitives/AppText';

interface ListRowProps {
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
  /** The meta at the subtitle's size in ink-2 (a code the reader must read), not the quiet 2xs ink-3. */
  metaStrong?: boolean;
  /** Third line: chips and short words that wrap (a thread's lead status + source). */
  tags?: ReactNode;
  /** At the inline-end, usually a <StatusChip>. At most 45 % of the row: a long word ellipsizes. */
  trailing?: ReactNode;
  /** Makes the title the row's header and a link of its own (a student's name → their file). */
  titleLink?: TitleLink;
  /** Makes the row a button (opens the detail). Without it the row is plain text. */
  onPress?: () => void;
  /** What a tap opens, for the screen reader (only with onPress). */
  accessibilityHint?: string;
}

/**
 * One list row, 56pt minimum. Inside an inset group (LazyList, InsetGroup: the app's container rule)
 * the group draws the fill and the rules between rows; alone it keeps its own fill and hairline below.
 */
export function ListRow(props: ListRowProps) {
  const { leading, title, subtitle, subtitleLeading, subtitleLabel, meta, metaStrong, tags, trailing, onPress } = props;
  const { titleLink } = props;
  const { color } = useTheme();
  const inset = useInset();
  const row: ViewStyle = {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...(inset ? null : { borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }),
  };
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <ListRowTitle title={title} meta={meta} metaStrong={metaStrong} link={titleLink} />
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
      accessibilityHint={props.accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [row, pressed ? { backgroundColor: color.sunk, opacity: 0.85 } : null]}
    >
      {body}
    </Pressable>
  );
}
