import Svg, { Path } from 'react-native-svg';

type PlayerIconName = 'play' | 'pause' | 'back' | 'forward';

/** Drawn on a 24 grid; the skip arrows carry «10» beside them in the button. */
const PATHS: Readonly<Record<PlayerIconName, string>> = {
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  back: 'M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
  forward: 'M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z',
};

/** One player glyph in the given colour, hidden from screen readers (the button speaks). */
interface PlayerIconProps {
  name: PlayerIconName;
  color: string;
  size?: number;
}

export function PlayerIcon({ name, color, size = 24 }: PlayerIconProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={PATHS[name]} fill={color} />
    </Svg>
  );
}
