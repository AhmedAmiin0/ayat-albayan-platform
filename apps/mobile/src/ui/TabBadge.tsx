import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from './AppText';

/**
 * The count at the icon's top end (the left in Arabic), ringed in what lies behind it: the pill on the
 * active tab, the capsule elsewhere. Hidden from screen readers: the tab's own label says the count.
 * Its text does not scale: the 18pt pill would clip it.
 */
export function TabBadge({ text, onPill }: { text: string; onPill: boolean }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: -4,
        end: -8,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: color.lapisFill,
        boxShadow: `0 0 0 2px ${onPill ? color.lapisWash : color.raised}`,
      }}
    >
      <AppText
        allowFontScaling={false}
        style={{ fontSize: type.size['2xs'], lineHeight: 18, fontWeight: '600', color: color.onLapis, textAlign: 'center' }}
      >
        {text}
      </AppText>
    </View>
  );
}
