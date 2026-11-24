import { callClock, callPhaseText, callStatusText, type CallPhase, type CallSession } from '@ab/client-core';
import type { ActiveCallView } from '@ab/shared';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncExternalStore } from 'react';
import {
  t,
  type,
  useTheme,
  AppText,
  IconButton,
  Avatar,
  ChevronDownIcon,
  HangUpIcon,
  CallMicIcon,
  MicOffIcon,
  PhoneIcon,
  SpeakerIcon,
  RoundButton,
} from '@ab/mobile-kit';
import { CallerName } from './CallerName';

interface CallActions {
  hangup: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  minimise: () => void;
}

interface CallScreenProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  actions: CallActions;
}

/** docs/28 §5: the phase is announced on change only; the ticking timer is not read out. */
export function CallScreen({ session, row, phase, actions }: CallScreenProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useSyncExternalStore(phase === 'active' ? callClock.subscribe : callClock.still, callClock.read);
  const status = callStatusText(phase, { row, now, text: t.calls });
  return (
    <View
      testID="call-screen"
      style={{
        flex: 1,
        backgroundColor: color.cover,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhoneIcon color={color.coverInk} size={16} />
          <AppText style={{ fontSize: type.size.xs, color: color.coverInk }}>
            {t.calls.voiceCall}
          </AppText>
        </View>
        <IconButton label={t.calls.controls.minimise} onPress={actions.minimise}>
          <ChevronDownIcon color={color.coverInk} />
        </IconButton>
      </View>
      <View style={{ alignItems: 'center', gap: 16, marginTop: '18%' }}>
        <Avatar name={session.name} id={session.phone} size="xl" decorative />
        <CallerName name={session.name} />
        <AppText
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ fontSize: type.size.sm, color: color.coverInk, fontVariant: ['tabular-nums'] }}
        >
          {status}
        </AppText>
        <AppText
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        >
          {callPhaseText(phase, t.calls)}
        </AppText>
      </View>
      {phase !== 'ended' ? (
        <View
          style={{
            marginTop: 'auto',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'flex-start',
          }}
        >
          <RoundButton
            label={t.calls.controls.mute}
            tone="plain"
            pressed={session.muted}
            onPress={actions.toggleMute}
            icon={(ink) =>
              session.muted ? <MicOffIcon color={ink} /> : <CallMicIcon color={ink} />
            }
          />
          <RoundButton
            label={t.calls.controls.speaker}
            tone="plain"
            pressed={session.speaker}
            onPress={actions.toggleSpeaker}
            icon={(ink) => <SpeakerIcon color={ink} />}
          />
          <RoundButton
            label={t.calls.controls.end}
            tone="end"
            onPress={actions.hangup}
            icon={(ink) => <HangUpIcon color={ink} size={26} />}
          />
        </View>
      ) : null}
    </View>
  );
}
