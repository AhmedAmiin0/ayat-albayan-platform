import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { Animated, Image, Modal, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shape, useTheme } from '@/theme';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { DownloadLink } from '../copy-download/DownloadLink';
import { useZoom } from './use-zoom';
import { ViewerClose } from './ViewerClose';

interface PhotoViewerProps {
  uri: string;
  /** Its kind and caption, for the screen reader. */
  label: string;
  message: MessageView;
  phone: string;
  onClose: () => void;
}

/** The photo at full size, pinch to zoom 1×–4×, pan when zoomed, a double tap 1× ⇄ 2.5× (use-zoom). */
function ZoomPhoto({ uri, label }: { uri: string; label: string }) {
  const window = useWindowDimensions();
  // The pan limit is the photo's area (under «إغلاق», above «تنزيل»), measured once laid out.
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const zoom = useZoom({ size, reduceMotion: useA11yPref('reduceMotion') });
  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      {...zoom.handlers}
    >
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

/**
 * A chat photo full screen (owner 2026-10-26), RN core only (no native module: the APK updates by
 * OTA): black, the photo uncut, «إغلاق» at the top start, Android's back closes it, «تنزيل» below.
 */
export function PhotoViewer({ uri, label, message, phone, onClose }: PhotoViewerProps) {
  const { color } = useTheme();
  return (
    <Modal testID="photo-viewer" visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'black' }}>
        <ViewerClose onClose={onClose} />
        <ZoomPhoto uri={uri} label={label} />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ paddingHorizontal: 16, borderRadius: shape.radius.lg, backgroundColor: color.raised }}>
            <DownloadLink message={message} phone={phone} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
