import { useState } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useA11yPref } from '../../../../ui/primitives/use-a11y-pref';
import { useZoom } from '../../use-zoom';

export function useZoomPhoto() {
  const window = useWindowDimensions();
  // The pan limit is the photo's area between close and download, measured once laid out.
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const zoom = useZoom({ size, reduceMotion: useA11yPref('reduceMotion') });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  return { zoom, onLayout };
}
