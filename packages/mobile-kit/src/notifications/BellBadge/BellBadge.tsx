import { View } from 'react-native';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';

/** The bell's unread count at its top corner, hidden from screen readers (the name says it). */
export function BellBadge({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View
      testID="bell-badge"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 4,
        end: 2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.bad,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: 11,
          lineHeight: 14,
          color: color.onBad,
          fontVariant: ['tabular-nums'],
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
