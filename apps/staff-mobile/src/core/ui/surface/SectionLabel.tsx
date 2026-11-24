import { type, useTheme, AppText } from '@ab/mobile-kit';

export function SectionLabel({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        fontFamily: type.ui[600],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs, true),
        color: color.ink3,
      }}
    >
      {children}
    </AppText>
  );
}
