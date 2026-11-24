import { formatClock, resumeAt } from '@ab/client-core';
import { Pressable, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { ErrorLine } from '../../feedback/ErrorLine';
import { AppText } from '../../primitives/AppText';
import { ltr } from '../../primitives/Ltr';
import { raisedCard } from '../../surface/surface';
import type { CreateAudioSource } from './audio-source';
import { PlayerControls } from './PlayerControls';
import { ProgressBar } from './ProgressBar';
import { useAudioPlayer, type AudioPlayerControls } from './use-audio-player';
import { useResumeMap } from './use-resume';

interface AudioPlayerProps {
  /** The recording's or file's id: its saved stop. */
  id: string;
  /** A signed link (an hour). */
  url: string;
  /** The media, from the app (family: expo-audio; tests: a fake). The kit has no media module. */
  createSource: CreateAudioSource;
}

/** Shown while the saved stop is ahead of the start. */
function ResumeLine({ player, from }: { player: AudioPlayerControls; from: number }) {
  const { color } = useTheme();
  if (from <= 0 || player.state.position <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
        {t.audioPlayer.resumeFrom.replace('{at}', ltr(formatClock(from)))}
      </AppText>
      <Pressable accessibilityRole="button" onPress={player.startOver} hitSlop={8}>
        <AppText style={{ fontSize: type.size.xs, color: color.lapis }}>
          {t.audioPlayer.startOver}
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * The in-app audio player (owner 2026-11-17): play/pause, ±10 s, speed, and the saved stop.
 * The media itself is behind the AudioSource the app passes in.
 */
export function AudioPlayer({ id, url, createSource }: AudioPlayerProps) {
  const { color } = useTheme();
  const from = resumeAt(useResumeMap(), id);
  const player = useAudioPlayer({ id, url, startAt: from, createSource });
  return (
    <View style={[raisedCard(color, 16), { padding: 16, gap: 14 }]}>
      <ResumeLine player={player} from={from} />
      <ProgressBar
        position={player.state.position}
        duration={player.state.duration}
        seek={player.seek}
      />
      <PlayerControls player={player} />
      {player.state.status === 'failed' ? <ErrorLine message={t.audioPlayer.failed} /> : null}
    </View>
  );
}
