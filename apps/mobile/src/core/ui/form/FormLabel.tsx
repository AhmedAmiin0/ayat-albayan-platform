import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface FormLabelProps {
  children: string;
  /** Draws the «*»; a screen reader hears the label without it («نجمة»), the hint says it is required. */
  required?: boolean;
}

/** A form group's label, styled like ui/Field's own label so every row of the form matches. */
export function FormLabel({ children, required = false }: FormLabelProps) {
  const { color } = useTheme();
  return (
    <AppText
      {...(required ? { accessibilityLabel: children } : {})}
      style={{
        fontFamily: type.ui[600],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs, true),
        color: color.ink2,
      }}
    >
      {required ? `${children} *` : children}
    </AppText>
  );
}
