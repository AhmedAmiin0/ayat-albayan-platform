import { shape, type, useTheme, AppText } from '@ab/mobile-kit';

/** A kind, not a state: no tone, no glyph. */
export function Tag({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        overflow: 'hidden',
        fontFamily: type.ui[600],
        fontSize: type.size['2xs'],
        lineHeight: 20,
        color: color.ink2,
        backgroundColor: color.neutralSoft,
      }}
    >
      {children}
    </AppText>
  );
}
