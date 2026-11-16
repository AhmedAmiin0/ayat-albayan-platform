import { useLayoutEffect, useState } from 'react';
import {
  type Animated,
  type GestureResponderEvent,
  type GestureResponderHandlers,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import {
  clampPan,
  distance,
  isDoubleTap,
  isTap,
  pinchScale,
  type Point,
  toggleScale,
} from './zoom';
import { createZoomView, ORIGIN, type ZoomProps, type ZoomView } from './zoom-view';

interface Zoom {
  handlers: GestureResponderHandlers;
  /** For the Animated.View around the photo: pan first, so the offset is in screen points. */
  style: {
    transform: [
      { translateX: Animated.Value },
      { translateY: Animated.Value },
      { scale: Animated.Value },
    ];
  };
}

interface Gesture {
  panStart: Point;
  lastTap: number;
  pinch: null | { startScale: number; startDistance: number };
}

/** Two fingers: scale by how far they spread from where the pinch began. */
function pinch(view: ZoomView, g: Gesture, p: { touches: Point[]; props: ZoomProps }) {
  const [a, b] = p.touches;
  if (!a || !b) return false;
  const d = distance(a, b);
  g.pinch ??= { startScale: view.frame.scale, startDistance: d };
  const next = pinchScale({ ...g.pinch, distance: d });
  const offset = clampPan({ offset: view.frame.offset, scale: next, size: p.props.size });
  view.apply({ scale: next, offset }, false);
  return true;
}

/** One finger on a zoomed photo: pan, only as far as the photo reaches. */
function pan(view: ZoomView, g: Gesture, p: { move: PanResponderGestureState; props: ZoomProps }) {
  if (g.pinch || view.frame.scale <= 1) return;
  const at = { x: g.panStart.x + p.move.dx, y: g.panStart.y + p.move.dy };
  const offset = clampPan({ offset: at, scale: view.frame.scale, size: p.props.size });
  view.apply({ scale: view.frame.scale, offset }, false);
}

/** A single tap is remembered for the next one; a drag, a pinch or a double tap starts afresh. */
function release(view: ZoomView, g: Gesture, move: PanResponderGestureState) {
  const tap = g.pinch === null && isTap(move.dx, move.dy);
  g.pinch = null;
  const now = Date.now();
  const double = tap && isDoubleTap(g.lastTap, now);
  g.lastTap = tap && !double ? now : 0;
  if (double) view.apply({ scale: toggleScale(view.frame.scale), offset: ORIGIN }, true);
}

const touchesOf = (e: GestureResponderEvent): Point[] =>
  e.nativeEvent.touches.map((t) => ({ x: t.pageX, y: t.pageY }));

/** The responder and its values, made once; `update` hands it the latest props (it may rotate). */
function createZoom(initial: ZoomProps): { zoom: Zoom; update: (p: ZoomProps) => void } {
  let props = initial;
  const view = createZoomView(() => props);
  const g: Gesture = { panStart: ORIGIN, lastTap: 0, pinch: null };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      g.panStart = view.frame.offset;
      g.pinch = null;
    },
    onPanResponderMove: (e, move) => {
      if (pinch(view, g, { touches: touchesOf(e), props })) return;
      pan(view, g, { move, props });
    },
    onPanResponderRelease: (_e, move) => release(view, g, move),
  });
  const style: Zoom['style'] = {
    transform: [{ translateX: view.x }, { translateY: view.y }, { scale: view.scale }],
  };
  const zoom: Zoom = { handlers: responder.panHandlers, style };
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
