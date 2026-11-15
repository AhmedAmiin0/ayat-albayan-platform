import { type, useTheme, AppText } from '@ab/mobile-kit';

/** A block's title on the lead screen, like «تغيير الحالة» above the status chips. */
export function Heading({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole="header"
      style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}
    >
      {children}
    </AppText>
  );
}
