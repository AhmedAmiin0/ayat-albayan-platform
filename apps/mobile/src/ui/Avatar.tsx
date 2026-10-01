import { Text, View } from 'react-native';
import { type, useTheme } from '@/theme';

/** Initial-letter avatar (docs/07, web LeadListItem): gold-wash circle, decorative only. */
export function Avatar({ letter }: { letter: string }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: color.gold,
        backgroundColor: color.goldWash,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
        {letter}
      </Text>
    </View>
  );
}
