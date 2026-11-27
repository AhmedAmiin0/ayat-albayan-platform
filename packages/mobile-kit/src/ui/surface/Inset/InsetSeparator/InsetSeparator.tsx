import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../theme';
import { Rule } from '../Rule';

/** Between two virtualised rows: the card's fill and side edges continue, the rule is inset. */
export function InsetSeparator() {
  const { color } = useTheme();
  return (
    <View
      style={{
        backgroundColor: color.raised,
        borderColor: color.rule,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
      }}
    >
      <Rule />
    </View>
  );
}
