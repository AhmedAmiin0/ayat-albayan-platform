import { View } from 'react-native';
import { useTheme } from '../../theme';
import { BAR_HEIGHT } from '../layout/tab-bar-inset';
import { GlassGradient } from '../primitives/GlassGradient';

const EDGE = [[0, 0], [1, 1]] as const;

/**
 * The fade of the screen colour behind the bar, so rows scrolling under it melt away. It passes
 * touches through: nothing beside or above the capsule is a dead strip.
 */
export function TabEdge({ bottom }: { bottom: number }) {
  const { color } = useTheme();
  return (
    <View
      testID="tab-edge"
      style={{
        position: 'absolute',
        start: 0,
        end: 0,
        bottom: 0,
        height: bottom + BAR_HEIGHT + 32,
        pointerEvents: 'none',
      }}
    >
      <GlassGradient id="tab-edge" color={color.margin} stops={EDGE} />
    </View>
  );
}
