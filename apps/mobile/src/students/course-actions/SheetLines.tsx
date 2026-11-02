import { View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

/** A sheet's plain lines, one under the other. */
export function SheetLines({ lines }: { lines: readonly string[] }) {
  const { color } = useTheme();
  const size = type.size.sm;
  const style = {
    fontFamily: type.ui[500],
    fontSize: size,
    lineHeight: type.lineHeight(size),
    color: color.ink,
  };
  return (
    <View style={{ gap: 6 }}>
      {lines.map((text) => (
        <AppText key={text} style={style}>
          {text}
        </AppText>
      ))}
    </View>
  );
}
