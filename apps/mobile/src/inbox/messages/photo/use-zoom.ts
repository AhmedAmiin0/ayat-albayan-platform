import { useLayoutEffect, useState } from 'react';
import { Animated, type GestureResponderHandlers, PanResponder } from 'react-native';
import { clampPan, distance, isDoubleTap, isTap, pinchScale, type Point, toggleScale } from './zoom';

interface ZoomProps {
  size: { width: number; height: number };
  reduceMotion: boolean;
}

interface Frame {
  scale: number;
  offset: Point;
}

interface Zoom {
  handlers: GestureResponderHandlers;
  /** For the Animated.View around the photo: pan first, so the offset is in screen points. */
  style: { transform: [{ translateX: Animated.Value }, { translateY: Animated.Value }, { scale: Animated.Value }] };
}

const ORIGIN: Point = { x: 0, y: 0 };

/** The responder and its values, made once; `update` hands it the latest props (the window may rotate). */
function createZoom(initial: ZoomProps): { zoom: Zoom; update: (p: ZoomProps) => void } {
  let props = initial;
  const scale = new Animated.Value(1);
  const x = new Animated.Value(0);
  const y = new Animated.Value(0);
  const s = { view: { scale: 1, offset: ORIGIN } as Frame, panStart: ORIGIN, lastTap: 0, pinch: null as null | { startScale: number; startDistance: number } };
  const apply = (view: Frame, animate: boolean) => {
    s.view = view;
    if (!animate || props.reduceMotion) {
      scale.setValue(view.scale);
      x.setValue(view.offset.x);
      y.setValue(view.offset.y);
      return;
    }
    const to = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: 180, useNativeDriver: true });
    Animated.parallel([to(scale, view.scale), to(x, view.offset.x), to(y, view.offset.y)]).start();
  };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      s.panStart = s.view.offset;
      s.pinch = null;
    },
    onPanResponderMove: (e, g) => {
      const size = props.size;
      const [a, b] = e.nativeEvent.touches;
      if (a && b) {
        const d = distance({ x: a.pageX, y: a.pageY }, { x: b.pageX, y: b.pageY });
        s.pinch ??= { startScale: s.view.scale, startDistance: d };
        const next = pinchScale({ ...s.pinch, distance: d });
        return apply({ scale: next, offset: clampPan({ offset: s.view.offset, scale: next, size }) }, false);
      }
      if (s.pinch || s.view.scale <= 1) return;
      const offset = clampPan({ offset: { x: s.panStart.x + g.dx, y: s.panStart.y + g.dy }, scale: s.view.scale, size });
      apply({ scale: s.view.scale, offset }, false);
    },
    onPanResponderRelease: (_e, g) => {
      const pinched = s.pinch !== null;
      s.pinch = null;
      const now = Date.now();
      const double = !pinched && isTap(g.dx, g.dy) && isDoubleTap(s.lastTap, now);
      // A single tap is remembered for the next one; a drag, a pinch or a double tap starts afresh.
      s.lastTap = !pinched && isTap(g.dx, g.dy) && !double ? now : 0;
      if (double) apply({ scale: toggleScale(s.view.scale), offset: ORIGIN }, true);
    },
  });
  const zoom: Zoom = { handlers: responder.panHandlers, style: { transform: [{ translateX: x }, { translateY: y }, { scale }] } };
  return {
    zoom,
    update: (p) => {
      props = p;
    },
  };
}

/**
 * Pinch, pan and double tap on the full-screen photo with PanResponder and Animated only (RN core,
 * as SwipeReply: the installed APK has no gesture-handler or reanimated). The maths is zoom.ts.
 * Reduce Motion: the double tap jumps instead of animating.
 */
export function useZoom(p: ZoomProps): Zoom {
  const [made] = useState(() => createZoom(p));
  useLayoutEffect(() => made.update(p));
  return made.zoom;
}
