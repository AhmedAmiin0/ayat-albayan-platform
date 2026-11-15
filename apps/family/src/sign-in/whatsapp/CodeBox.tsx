import { View } from 'react-native';
import { AppText, shape, type, useTheme } from '@ab/mobile-kit';

/** rest: the 3:1 input edge; next: the box the next digit goes in; refused: the last try failed. */
export type BoxLook = 'rest' | 'next' | 'refused';

/** One box of the one-time code: 46 × 56, the digit at 23 pt; drawing only (CodeBoxes types). */
export function CodeBox({ digit, look }: { digit: string; look: BoxLook }) {
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
        width: 46,
        height: 56,
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
