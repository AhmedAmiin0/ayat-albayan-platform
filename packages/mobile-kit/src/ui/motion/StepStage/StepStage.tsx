import { Animated, I18nManager } from 'react-native';
import type { StepStageProps } from './StepStage.types';
import { SLIDE } from './step-stage.helpers';

/**
 * A form in steps (number → code; WhatsApp ↔ password): the next step slides in from the
 * reading end and the last one leaves the other way, both on `motion.progress`, while the
 * stage's height springs to the new step. Going back runs the same path in reverse. The leaving
 * step takes no touches and is hidden from screen readers.
 */
export function StepStage<K extends string>({ motion, render, still }: StepStageProps<K>) {
  const { stage } = motion;
  const reading = I18nManager.isRTL ? -1 : 1;
  const way = motion.direction === 'forward' ? 1 : -1;
  const shift = still ? 0 : SLIDE * reading * way;
  const p = motion.progress;
  const enter = p.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] });
  const leave = p.interpolate({ inputRange: [0, 1], outputRange: [0, -shift] });
  const fade = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View testID="step-stage" style={{ height: stage.height, overflow: 'hidden' }}>
      {motion.previous === null ? null : (
        <Animated.View
          key={motion.previous}
          testID="step-leaving"
          onLayout={stage.measure(motion.previous, false)}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: 0,
            start: 0,
            end: 0,
            opacity: fade,
            transform: [{ translateX: leave }],
          }}
        >
          {render(motion.previous)}
        </Animated.View>
      )}
      <Animated.View
        key={motion.current}
        onLayout={stage.measure(motion.current, true)}
        style={{ opacity: p, transform: [{ translateX: enter }] }}
      >
        {render(motion.current)}
      </Animated.View>
    </Animated.View>
  );
}
