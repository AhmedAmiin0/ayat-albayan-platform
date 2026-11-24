import { PLAYER_SPEEDS, speedLabel, type PlayerSpeed } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { FilterPills } from '../FilterPills';
import { AppText } from '../../primitives/AppText';
import { IconButton } from '../../primitives/IconButton';
import { PlayerIcon } from './PlayerIcon';
import type { AudioPlayerControls } from './use-audio-player';

type SpeedKey = `${PlayerSpeed}`;
const SPEEDS = PLAYER_SPEEDS.map((s) => ({ value: `${s}` as const, label: speedLabel(s) }));
const SPEED_OF = Object.fromEntries(PLAYER_SPEEDS.map((s) => [`${s}`, s])) as Record<
  SpeedKey,
  PlayerSpeed
>;

export function PlayerControls({ player }: { player: AudioPlayerControls }) {
  const { color } = useTheme();
  const playing = player.state.status === 'playing';
  const ten = { fontSize: type.size['2xs'], color: color.ink3 };
  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
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
      </View>
      <FilterPills
        role="radiogroup"
        wrap
        accessibilityLabel={t.audioPlayer.speed}
        items={SPEEDS}
        value={`${player.state.speed}`}
        onChange={(v) => player.setSpeed(SPEED_OF[v])}
      />
    </View>
  );
}
