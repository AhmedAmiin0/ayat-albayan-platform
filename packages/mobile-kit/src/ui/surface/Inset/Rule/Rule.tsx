import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../theme';

/** The rule between two rows, inset 16pt from both sides. */
export function Rule() {
  const { color } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
        backgroundColor: color.rule,
      }}
    />
  );
}
