import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { IconButton } from '@/ui/IconButton';
import { PauseIcon, PlayIcon } from './chat-icons';
import { mediaProgress, mediaTime } from './media-time';
import { useSmall } from './MessageMeta';

/**
 * A voice note inside the bubble (owner 2026-10-19 #1): play/pause, a progress bar and its length
 * (the position while it plays), as WhatsApp. It starts on mount: the tap that fetched it was the
 * «تشغيل». The URL is pinned on mount, so a refetched signed URL never restarts playback.
 */
export function AudioPlayer({ url, kind }: { url: string; kind: string }) {
  const { color } = useTheme();
  const small = useSmall();
  const [source] = useState(url);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  useEffect(() => player.play(), [player]);

  const toggle = () => {
    if (status.playing) return player.pause();
    // At the end: from the start again, as WhatsApp.
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      void player.seekTo(0);
    }
    player.play();
  };
  const progress = mediaProgress(status.currentTime, status.duration);
  const shown = status.playing || status.currentTime > 0 ? status.currentTime : status.duration;
  return (
    <View testID="audio-player" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 200 }}>
      <IconButton
        label={status.playing ? t.inbox.pauseMedia : t.inbox.playMedia.replace('{kind}', kind)}
        onPress={toggle}
      >
        {status.playing ? <PauseIcon color={color.lapis} /> : <PlayIcon color={color.lapis} />}
      </IconButton>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        style={{ flex: 1, height: 4, borderRadius: shape.radius.pill, backgroundColor: color.ruleInput }}
      >
        <View
          testID="audio-progress"
          style={{
            width: `${progress * 100}%`,
            height: 4,
            borderRadius: shape.radius.pill,
            backgroundColor: color.lapis,
          }}
        />
      </View>
      <AppText style={small}>{mediaTime(shown)}</AppText>
    </View>
  );
}
