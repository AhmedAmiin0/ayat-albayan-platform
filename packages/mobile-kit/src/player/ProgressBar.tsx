import { formatClock, progressOf, seekAtPoint, SKIP_SECONDS } from '@ab/client-core';
import { useState } from 'react';
import {
  I18nManager, View, type AccessibilityActionEvent, type GestureResponderEvent,
} from 'react-native';
import { t } from '../lib/i18n/i18n';
import { shape, type, useTheme } from '../theme';
import { AppText } from '../ui/primitives/AppText';
import { ltr } from '../ui/primitives/Ltr';

interface SeekBarProps {
  position: number;
  duration: number;
  seek: (position: number) => void;
}

const STEP: Readonly<Record<string, number>> = { increment: 1, decrement: -1 };
const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

/**
 * «موضع التشغيل»: the heard share as a bar you tap or drag to seek (a screen reader swipes it
 * ±10 s), the clock under it «12:40 … 45:20» (an unknown length shows «—»).
 */
export function ProgressBar({ position, duration, seek }: SeekBarProps) {
  const { color } = useTheme();
  const [width, setWidth] = useState(0);
  const share = progressOf(position, duration);
  const total = duration > 0 ? formatClock(duration) : '—';
  const at = formatClock(position);
  const small = { fontSize: type.size.xs, color: color.ink3, fontVariant: ['tabular-nums' as const] };
  const touch = (e: GestureResponderEvent) =>
    seek(seekAtPoint({ x: e.nativeEvent.locationX, width, duration, rtl: I18nManager.isRTL }));
  const onAction = (e: AccessibilityActionEvent) =>
    seek(position + (STEP[e.nativeEvent.actionName] ?? 0) * SKIP_SECONDS);
  return (
    <View style={{ gap: 6 }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.audioPlayer.seek}
        accessibilityValue={{ text: t.audioPlayer.position.replace('{at}', at).replace('{total}', total) }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={onAction}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={touch}
        onResponderMove={touch}
        testID="player-seek"
        style={{ height: 44, justifyContent: 'center' }}
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
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText style={small}>{ltr(at)}</AppText>
        <AppText style={small}>{ltr(total)}</AppText>
      </View>
    </View>
  );
}
