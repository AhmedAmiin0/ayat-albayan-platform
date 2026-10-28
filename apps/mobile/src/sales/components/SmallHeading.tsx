import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** A small ink-2 heading inside a card («تغييرات الحالة», «الدفعات المرتبطة»); `header` for a screen reader's headings list. */
export function SmallHeading({ children, header }: { children: string; header?: boolean }) {
  const { color } = useTheme();
  return (
    <AppText accessibilityRole={header ? 'header' : undefined} style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
      {children}
    </AppText>
  );
}
