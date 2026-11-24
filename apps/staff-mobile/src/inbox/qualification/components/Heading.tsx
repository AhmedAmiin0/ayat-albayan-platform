import { type, useTheme, AppText } from '@ab/mobile-kit';

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
