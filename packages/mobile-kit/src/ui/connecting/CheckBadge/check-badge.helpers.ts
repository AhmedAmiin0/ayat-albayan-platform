import { Animated } from 'react-native';
import { Path } from 'react-native-svg';

export const AnimatedPath = Animated.createAnimatedComponent(Path);
export const SIZE = 20;
/** The design's dash travel (24 → 0), mapped onto the tick's real length. */
export const TRAVEL = 24;
export const TICK_LENGTH = 11.4;
