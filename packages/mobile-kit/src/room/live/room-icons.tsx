import Svg, { Path } from 'react-native-svg';

// The room's own line icons (24 grid, as the calls' call-icons.tsx): decorative, every button
// names its action.

interface RoomIconProps {
  color: string;
  size?: number;
}

const draw = (paths: readonly string[]) =>
  function RoomIcon({ color, size = 22 }: RoomIconProps) {
    return (
      <Svg
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <Path key={d} d={d} />
        ))}
      </Svg>
    );
  };

export const ChatIcon = draw(['M4 5.5h16v10H9l-5 4z']);
/** A wired headset. */
export const HeadsetIcon = draw(['M4 15v-3a8 8 0 0 1 16 0v3', 'M4 15h3v5H4zM17 15h3v5h-3z']);
/** Bluetooth's rune. */
export const BluetoothIcon = draw(['m7 7 10 10-5 4V3l5 4L7 17']);
export const RemoveIcon = draw([
  'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  'M2 21a7 7 0 0 1 14 0M16 11h6',
]);
/** A notice that something went wrong: a circle with «!». */
export const AlertIcon = draw(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5v5.5M12 16.5v.01']);
export const ExpandIcon = draw(['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5']);
