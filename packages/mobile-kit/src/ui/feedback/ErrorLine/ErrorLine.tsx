import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { ErrorLineProps } from './ErrorLine.types';

/** A failed action under its control, announced as an alert. The data on screen rolled back. */
export function ErrorLine({ message }: ErrorLineProps) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: color.bad,
      }}
    >
      {message}
    </AppText>
  );
}
