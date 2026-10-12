import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** A card's heading: 16pt bold ink, announced as a header. */
export function CardTitle({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText accessibilityRole="header" style={{ flexShrink: 1, fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
      {children}
    </AppText>
  );
}
