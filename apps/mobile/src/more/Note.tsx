import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** Small ink-3 line: a hint («المواعيد بتوقيت الرياض») or an empty note («مفيش إجازات»). */
export function Note({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <AppText
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
