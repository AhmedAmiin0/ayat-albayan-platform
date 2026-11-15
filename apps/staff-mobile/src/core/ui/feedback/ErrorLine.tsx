import { type, useTheme, AppText } from '@ab/mobile-kit';

/** A failed action under its control, announced as an alert. The data on screen already rolled back. */
export function ErrorLine({ message }: { message: string }) {
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
