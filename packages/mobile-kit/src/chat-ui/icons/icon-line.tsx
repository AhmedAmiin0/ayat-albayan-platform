import Svg, { Path } from 'react-native-svg';

export interface ChatIconProps {
  color: string;
  size?: number;
}

// Line icons for the chat's icon buttons (24px grid, 1.75 stroke, as the tab icons). Decorative:
// each IconButton names its action. Hidden from screen readers here as Chevron is.
export const hiddenIcon = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** One stroked path on the 24 grid; every chat icon is drawn with it. */
export function IconLine({ color, size = 22, d }: ChatIconProps & { d: string }) {
  return (
    <Svg
      {...hiddenIcon}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={d} />
    </Svg>
  );
}
