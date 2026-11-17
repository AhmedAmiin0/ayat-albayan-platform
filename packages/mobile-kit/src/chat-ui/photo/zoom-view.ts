import { Animated } from 'react-native';
import type { Point } from './zoom';

export interface ZoomProps {
  size: { width: number; height: number };
  reduceMotion: boolean;
}

export interface Frame {
  scale: number;
  offset: Point;
}

export const ORIGIN: Point = { x: 0, y: 0 };

/** The photo's animated scale and offset, and the frame they show now. */
export interface ZoomView {
  scale: Animated.Value;
  x: Animated.Value;
  y: Animated.Value;
  frame: Frame;
  /** Shows `frame`: at once, or animated over 180 ms (never with Reduce Motion). */
  apply: (frame: Frame, animate: boolean) => void;
}

const to = (value: Animated.Value, toValue: number) =>
  Animated.timing(value, { toValue, duration: 180, useNativeDriver: true });

export function createZoomView(props: () => ZoomProps): ZoomView {
  const view: ZoomView = {
    scale: new Animated.Value(1),
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    frame: { scale: 1, offset: ORIGIN },
    apply: (frame, animate) => {
      view.frame = frame;
      if (!animate || props().reduceMotion) {
        view.scale.setValue(frame.scale);
        view.x.setValue(frame.offset.x);
        view.y.setValue(frame.offset.y);
        return;
      }
      const moves = [to(view.scale, frame.scale), to(view.x, frame.offset.x)];
      Animated.parallel([...moves, to(view.y, frame.offset.y)]).start();
    },
  };
  return view;
}
