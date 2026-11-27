import { type, useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import type { HeaderTitleProps } from './HeaderTitle.types';
import { TITLE } from './header-title.helpers';

export function HeaderTitle({ title, count, titleRef }: HeaderTitleProps) {
  const { color } = useTheme();
  return (
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
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.sm,
            color: color.ink3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {` · ${count}`}
        </AppText>
      )}
    </AppText>
  );
}
