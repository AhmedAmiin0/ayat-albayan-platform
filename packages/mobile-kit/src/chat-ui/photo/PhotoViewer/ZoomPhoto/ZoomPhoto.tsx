import { Animated, Image, View } from 'react-native';
import type { ZoomPhotoProps } from './ZoomPhoto.types';
import { useZoomPhoto } from './use-zoom-photo';

/**
 * The photo at full size, pinch to zoom 1×–4×, pan when zoomed, a double tap 1× ⇄ 2.5× (use-zoom).
 */
export function ZoomPhoto({ uri, label }: ZoomPhotoProps) {
  const { zoom, onLayout } = useZoomPhoto();
  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout} {...zoom.handlers}>
      <Animated.View style={[{ flex: 1 }, zoom.style]}>
        <Image
          source={{ uri }}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}
