import { Pressable, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';

/** A row's header turned into a link: what a tap opens, and what the reader says for it. */
export interface TitleLink {
  onPress: () => void;
  label: string;
}

interface ListRowTitleProps {
  title: string;
  meta?: string;
  metaStrong?: boolean;
  /** The title becomes the row's header (lg, bold) and a link of its own, 44pt with its slop. */
  link?: TitleLink;
}

/**
 * ListRow's first line: the name (one line, «…» when long) and the LTR meta beside it. With
 * `link` the name is the row's header (owner 2026-10-30): bigger and bolder than the lines below,
 * its own tap target even inside a pressable row.
 */
export function ListRowTitle({ title, meta, metaStrong, link }: ListRowTitleProps) {
  const { color } = useTheme();
  const size = link ? type.size.lg : type.size.body;
  const lineHeight = type.lineHeight(size);
  const line = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontFamily: type.ui[link ? 700 : 600],
          fontSize: size,
          lineHeight,
          color: color.ink,
        }}
      >
        {title}
      </AppText>
      {meta ? (
        <Ltr
          style={{
            fontFamily: type.ui[metaStrong ? 500 : 400],
            fontSize: type.size[metaStrong ? 'xs' : '2xs'],
            color: metaStrong ? color.ink2 : color.ink3,
            // The quiet meta (a phone beside a name) steps back so the name leads.
            opacity: metaStrong ? 1 : 0.85,
          }}
        >
          {meta}
        </Ltr>
      ) : null}
    </View>
  );
  if (!link) return line;
  const slop = Math.max(0, Math.ceil((shape.control.touch - lineHeight) / 2));
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={link.label}
      onPress={link.onPress}
      hitSlop={{ top: slop, bottom: slop }}
      style={({ pressed }) => ({ alignSelf: 'stretch', opacity: pressed ? 0.6 : 1 })}
    >
      {line}
    </Pressable>
  );
}
