import { Text } from 'react-native';
import { type, useTheme } from '@/theme';

/** Small ink-3 line: a hint («المواعيد بتوقيت الرياض») or an empty note («مفيش إجازات»). */
export function Note({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <Text
      style={{
        fontFamily: type.ui[400],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink3,
      }}
    >
      {children}
    </Text>
  );
}
