import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TabIcon, type TabIconName } from '@/ui/TabIcon';

// The two teacher tabs the admin icon set lacks, drawn like ui/TabIcon (24px, 1.75 stroke, round).
const EXTRA = {
  schedule: ['M4 5.5h16v15H4z', 'M4 10h16', 'M8.5 3v4M15.5 3v4'],
  reports: ['M6 3.5h8.5L18 7v13.5H6z', 'M9 11h6M9 14.5h6M9 18h3.5'],
} as const;

export type TeacherTabIconName = TabIconName | keyof typeof EXTRA;

export function TeacherTabIcon({ name, color }: { name: TeacherTabIconName; color: ColorValue }) {
  if (name !== 'schedule' && name !== 'reports') return <TabIcon name={name} color={color} />;
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
      {EXTRA[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
