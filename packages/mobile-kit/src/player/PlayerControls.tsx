import { speedLabel } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { type, useTheme } from '../theme';
import { AppText } from '../ui/primitives/AppText';
import { IconButton } from '../ui/primitives/IconButton';
import { PlayerIcon } from './PlayerIcon';
import type { AudioPlayerControls } from './use-audio-player';

/** «10 ↺» · play/pause · «↻ 10», then «السرعة 1×» (tap for the next speed). */
export function PlayerControls({ player }: { player: AudioPlayerControls }) {
  const { color } = useTheme();
  const playing = player.state.status === 'playing';
  const speed = speedLabel(player.state.speed);
  const ten = { fontSize: type.size['2xs'], color: color.ink3 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <IconButton label={t.audioPlayer.back} onPress={() => player.skip(-1)}>
        <PlayerIcon name="back" color={color.ink2} />
        <AppText style={ten}>10</AppText>
      </IconButton>
      <IconButton
        variant="filled"
        label={playing ? t.audioPlayer.pause : t.audioPlayer.play}
        onPress={player.toggle}
        testID="player-toggle"
      >
        <PlayerIcon name={playing ? 'pause' : 'play'} color={color.onLapis} />
      </IconButton>
      <IconButton label={t.audioPlayer.forward} onPress={() => player.skip(1)}>
        <PlayerIcon name="forward" color={color.ink2} />
        <AppText style={ten}>10</AppText>
      </IconButton>
      <IconButton label={t.audioPlayer.speedOf.replace('{speed}', speed)} onPress={player.cycleSpeed}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.lapis }}>
          {speed}
        </AppText>
      </IconButton>
    </View>
  );
}
