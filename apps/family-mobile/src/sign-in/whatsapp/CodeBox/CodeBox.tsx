import { View } from 'react-native';
import { AppText, shape, type, useTheme } from '@ab/mobile-kit';
import type { BoxLook, CodeBoxProps } from './CodeBox.types';

/** One box of the one-time code (up to 52 wide, 46:56; six fit 312 pt), drawing only. */
export function CodeBox({ digit, look }: CodeBoxProps) {
  const { color } = useTheme();
  const edge: Record<BoxLook, string> = {
    rest: color.ruleInput,
    next: color.lapis,
    refused: color.bad,
  };
  return (
    <View
      testID="code-box"
      style={{
        flex: 1,
        maxWidth: 52,
        aspectRatio: 46 / 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.lg,
        borderWidth: look === 'rest' ? 1 : 2,
        borderColor: edge[look],
        backgroundColor: color.raised,
      }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.h3, color: color.ink }}>
        {digit}
      </AppText>
    </View>
  );
}
