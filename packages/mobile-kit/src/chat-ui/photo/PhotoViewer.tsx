import { type ReactNode, useState } from 'react';
import { Animated, Image, Modal, StatusBar, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';
import { useZoom } from './use-zoom';
import { ViewerClose } from './ViewerClose';
import { ViewerFooter } from './ViewerFooter';

interface PhotoViewerProps {
  uri: string;
  /** Its kind and caption, for the screen reader. */
  label: string;
  footer?: ReactNode;
  onClose: () => void;
}

/**
 * The photo at full size, pinch to zoom 1×–4×, pan when zoomed, a double tap 1× ⇄ 2.5× (use-zoom).
 */
function ZoomPhoto({ uri, label }: { uri: string; label: string }) {
  const window = useWindowDimensions();
  // The pan limit is the photo's area between close and download, measured once laid out.
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const zoom = useZoom({ size, reduceMotion: useA11yPref('reduceMotion') });
  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
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

/** RN core only, no native module, so the APK updates by OTA; Android back closes it. */
export function PhotoViewer({ uri, label, footer, onClose }: PhotoViewerProps) {
  return (
    <Modal
      testID="photo-viewer"
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'black' }}>
        <ViewerClose onClose={onClose} />
        <ZoomPhoto uri={uri} label={label} />
        <ViewerFooter>{footer}</ViewerFooter>
      </SafeAreaView>
    </Modal>
  );
}
