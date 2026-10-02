import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** A form group's label, styled like ui/Field's own label so every row of the form matches. */
export function FormLabel({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        fontFamily: type.ui[600],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs, true),
        color: color.ink2,
      }}
    >
      {children}
    </AppText>
  );
}
