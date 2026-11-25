import type { ReactNode, Ref } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '../../theme';
import { HeaderConnectingBar } from '../connecting/HeaderConnectingBar';
import { Mark } from '../primitives/Mark';
import { AppText, type AppTextNode } from '../primitives/AppText';

/**
 * The title's size: every screen and sheet at h4 (20pt), one header pattern, so the content
 * starts higher.
 */
const TITLE = type.size.h4;

interface ScreenHeaderProps {
  /** Amiri title, e.g. t.mobile.today. Mobile has no cartouche: this is the screen's one title. */
  title: string;
  subtitle?: string;
  /** Only a number the API returned; undefined while it loads. */
  count?: number;
  /** At the inline-end; defaults to the small gold mark. */
  trailing?: ReactNode;
  /** Before the title at the inline-start (the right in Arabic): the screen's BackButton. */
  leading?: ReactNode;
  /** A sheet or dialog takes h2 so the title fits beside close (docs/07 §6). */
  size?: 'h1' | 'h2';
  /** The title's node, e.g. to move screen-reader focus to it when a sheet changes mode. */
  titleRef?: Ref<AppTextNode>;
  /** The reconnecting bar under the title; on for h1. A screen with a compact h2 title passes true. */
  connecting?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  count,
  trailing = <Mark size={28} />,
  leading,
  size = 'h1',
  titleRef,
  connecting = size === 'h1',
}: ScreenHeaderProps) {
  const { color } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <HeaderLeading node={leading} />
        <AppText
          ref={titleRef}
          accessibilityRole="header"
          // One line always, even where a title wraps in English: it shrinks to fit.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            flexShrink: 1,
            // Takes the middle: a leading back hugs it, the trailing stays at the end.
            flexGrow: 1,
            fontFamily: type.display,
            fontSize: TITLE,
            lineHeight: type.lineHeight(TITLE, true),
            color: color.ink,
          }}
        >
          {title}
          {count === undefined ? null : (
            <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink3, fontVariant: ['tabular-nums'] }}>
              {` · ${count}`}
            </AppText>
          )}
        </AppText>
        {trailing}
      </View>
      {subtitle ? (
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs, true),
            color: color.ink2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {subtitle}
        </AppText>
      ) : null}
      {connecting ? <HeaderConnectingBar /> : null}
    </View>
  );
}

/** The chevron's 44pt box reaches the screen's start edge and hugs the title, as ChatHeader. */
function HeaderLeading({ node }: { node: ReactNode }) {
  return node ? <View style={{ marginStart: -10, marginEnd: -8 }}>{node}</View> : null;
}
