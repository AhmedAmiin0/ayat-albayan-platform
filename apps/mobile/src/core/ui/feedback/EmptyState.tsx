import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '../primitives/AppText';

/** docs/07 §10: dashed box, 56px gold double-outline rhombus (never the rosette), Amiri title. */
export function EmptyState({ title }: { title: string }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingVertical: 36,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: color.ruleStrong,
        borderRadius: shape.radius.lg,
      }}
    >
      <Svg
        viewBox="0 0 56 56"
        width={56}
        height={56}
        color={color.gold}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path d="M28 4 52 28 28 52 4 28Z" fill="none" stroke="currentColor" strokeWidth={1.5} />
        <Path
          d="M28 11 45 28 28 45 11 28Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="1.5 3"
        />
      </Svg>
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.display,
          fontSize: type.size.h3,
          lineHeight: type.lineHeight(type.size.h3, true),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
    </View>
  );
}
