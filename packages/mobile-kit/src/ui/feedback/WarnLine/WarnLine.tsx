import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { WarnLineProps } from './WarnLine.types';

/** A caution under a choice (a hamish line: gold-soft rule, act ink); not an error. */
export function WarnLine({ message }: WarnLineProps) {
  const { color } = useTheme();
  return (
    <View style={{ borderStartWidth: 3, borderStartColor: color.goldSoft, paddingStart: 10 }}>
      <AppText
        accessibilityRole="text"
        accessibilityLabel={message}
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.act,
        }}
      >
        {message}
      </AppText>
    </View>
  );
}
