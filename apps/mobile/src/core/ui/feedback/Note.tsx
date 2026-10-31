import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * Small ink-3 line: a hint («المواعيد بتوقيت الرياض») or an empty note («مفيش إجازات»). `alert`: a line that
 * replaces what was just done («أُزيل الرقم الثاني»), announced by the screen reader.
 */
export function Note({ children, alert = false }: { children: string; alert?: boolean }) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole={alert ? 'alert' : undefined}
      style={{
        fontFamily: type.ui[400],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink3,
      }}
    >
      {children}
    </AppText>
  );
}
