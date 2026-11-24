import { type, useTheme, AppText } from '@ab/mobile-kit';

export function SmallHeading({ children, header }: { children: string; header?: boolean }) {
  const { color } = useTheme();
  return (
    <AppText accessibilityRole={header ? 'header' : undefined} style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
      {children}
    </AppText>
  );
}
