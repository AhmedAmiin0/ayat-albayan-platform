import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Bottom-tab line icons (24px, 1.75 stroke, round ends). None is directional, so none mirrors in RTL.
const PATHS = {
  today: [
    'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2',
    'M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  ],
  // A calendar page: frame, the two rings and the header rule.
  schedule: ['M4.5 5.5h15v15h-15z', 'M8 3v4M16 3v4M4.5 10h15'],
  inbox: ['M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 20.5 11.5Z'],
  students: [
    'M2.5 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5V20',
    'M16 3.6a3.8 3.8 0 0 1 0 7.3M18.5 14.3a4.5 4.5 0 0 1 3 4.2V20',
  ],
  more: ['M4 6.5h16M4 12h16M4 17.5h16'],
} as const;

export type TabIconName = keyof typeof PATHS;

export interface TabIconProps {
  name: TabIconName;
  /** The tab bar's tint: lapis when focused, ink-3 otherwise. */
  color: ColorValue;
}

export function TabIcon({ name, color }: TabIconProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      testID={`tab-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'today' && <Circle cx={12} cy={12} r={4} />}
      {name === 'students' && <Circle cx={9} cy={7.5} r={3.8} />}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
