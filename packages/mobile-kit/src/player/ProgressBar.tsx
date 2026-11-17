import { formatClock, progressOf } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { shape, type, useTheme } from '../theme';
import { AppText } from '../ui/primitives/AppText';
import { ltr } from '../ui/primitives/Ltr';

/** The heard share as a bar, the clock under it: «12:40 … 45:20» (an unknown length shows «—»). */
export function ProgressBar({ position, duration }: { position: number; duration: number }) {
  const { color } = useTheme();
  const share = progressOf(position, duration);
  const total = duration > 0 ? formatClock(duration) : '—';
  const at = formatClock(position);
  const small = { fontSize: type.size.xs, color: color.ink3, fontVariant: ['tabular-nums' as const] };
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t.audioPlayer.seek}
      accessibilityValue={{ text: t.audioPlayer.position.replace('{at}', at).replace('{total}', total) }}
      style={{ gap: 6 }}
    >
      <View style={{ height: 6, borderRadius: shape.radius.pill, backgroundColor: color.sunk }}>
        <View
          style={{
            width: `${Math.round(share * 100)}%`,
            height: 6,
            borderRadius: shape.radius.pill,
            backgroundColor: color.lapisFill,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText style={small}>{ltr(at)}</AppText>
        <AppText style={small}>{ltr(total)}</AppText>
      </View>
    </View>
  );
}
