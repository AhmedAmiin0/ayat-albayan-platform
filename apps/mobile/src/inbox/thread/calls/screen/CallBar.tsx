import { callClock, callStatusText, type CallPhase, type CallSession } from '@ab/client-core';
import type { ActiveCallView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncExternalStore } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { PhoneIcon } from './call-icons';

/** Below a screen's header (ChatHeader / ScreenHeader are ~52pt). */
const HEADER = 56;

interface CallBarProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  onExpand: () => void;
}

/**
 * The minimised call (WhatsApp's green bar): a pill at the top, under the safe area and the screen's
 * one-line header, so it never covers the newest bubble or the composer; a tap goes back to the call.
 */
export function CallBar({ session, row, phase, onExpand }: CallBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useSyncExternalStore(phase === 'active' ? callClock.subscribe : callClock.still, callClock.read);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', start: 16, end: 16, top: insets.top + HEADER, alignItems: 'center' }}>
      <Pressable
        testID="call-bar"
        accessibilityRole="button"
        accessibilityLabel={`${t.calls.controls.expand} — ${session.name}`}
        onPress={onExpand}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 44, borderRadius: shape.radius.pill, backgroundColor: pressed ? color.lapisHover : color.lapisFill })}
      >
        <PhoneIcon color={color.onLapis} size={18} />
        <AppText numberOfLines={1} style={{ maxWidth: 180, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.onLapis }}>
          {session.name}
        </AppText>
        <AppText style={{ fontSize: type.size.sm, color: color.onLapis, fontVariant: ['tabular-nums'] }}>{callStatusText(phase, { row, now, text: t.calls })}</AppText>
      </Pressable>
    </View>
  );
}
