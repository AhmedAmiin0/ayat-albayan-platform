import { Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ViewerClose } from '../ViewerClose';
import { ViewerFooter } from '../ViewerFooter';
import type { PhotoViewerProps } from './PhotoViewer.types';
import { ZoomPhoto } from './ZoomPhoto';

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
