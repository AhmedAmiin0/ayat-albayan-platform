import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** The caller's name under the avatar, the screen's heading (one line, the display face). */
export function CallerName({ name }: { name: string }) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole="header"
      numberOfLines={1}
      style={{ fontFamily: type.display, fontSize: type.size.h3, lineHeight: type.lineHeight(type.size.h3, true), color: color.coverInk }}
    >
      {name}
    </AppText>
  );
}
