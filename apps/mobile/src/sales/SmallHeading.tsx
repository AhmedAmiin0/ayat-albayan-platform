import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** A small ink-2 heading inside a card («تغييرات الحالة», «الدفعات المرتبطة»). */
export function SmallHeading({ children }: { children: string }) {
  const { color } = useTheme();
  return <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>{children}</AppText>;
}
