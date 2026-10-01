import { Text } from 'react-native';
import { type, useTheme } from '@/theme';

/** Small ink-3 label over a quick-view block (البرنامج، ولي الأمر…). */
export function SectionLabel({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <Text
      style={{
        fontFamily: type.ui[600],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs, true),
        color: color.ink3,
      }}
    >
      {children}
    </Text>
  );
}
