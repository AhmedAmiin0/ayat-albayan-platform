import { useVideoPlayer, type VideoPlayerStatus, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Modal, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { ViewerClose } from '../photo/ViewerClose';
import { claimPlayback, releasePlayback } from './playback';
import { Spinner } from './Spinner';

interface VideoModalProps {
  id: string;
  url: string;
  kind: string;
  onClose: () => void;
  /** The player could not load it: closed, and the bubble says so. */
  onFail: () => void;
}

/**
 * A chat video full screen (owner 2026-10-27), never inline: an inverted FlatList flips its cells
 * (scaleY -1), which Android's SurfaceView ignores. Black, the system's controls, uncut, it starts with
 * sound once loaded (a ring until then); «إغلاق» or Android's back closes it and releases the player.
 */
export function VideoModal({ id, url, kind, onClose, onFail }: VideoModalProps) {
  const still = useA11yPref('reduceMotion');
  const [source] = useState(url);
  const player = useVideoPlayer(source, (p) => p.play());
  const [status, setStatus] = useState<VideoPlayerStatus>(player.status);
  useEffect(() => {
    claimPlayback(id, () => player.pause());
    const sub = player.addListener('statusChange', (e) => setStatus(e.status));
    return () => {
      sub.remove();
      releasePlayback(id);
    };
  }, [id, player]);
  useEffect(() => {
    if (status === 'error') onFail();
  }, [status, onFail]);
  return (
    <Modal testID="video-viewer" visible animationType={still ? 'none' : 'fade'} statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'black' }}>
        <ViewerClose onClose={onClose} label={t.inbox.closeVideo} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <VideoView testID="video-player" accessibilityLabel={kind} player={player} nativeControls contentFit="contain" style={{ flex: 1 }} />
          {status === 'readyToPlay' ? null : (
            <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center' }}>
              <Spinner color={palette.dark.ink} size={36} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
