import type { ActiveCallView } from '@ab/shared';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { IconButton } from '@/core/ui/primitives/IconButton';
import type { CallPhase, CallSession } from '../state/call-phase';
import { callPhaseText, callStatusText } from './call-status';
import {
  ChevronDownIcon,
  HangUpIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  SpeakerIcon,
} from './call-icons';
import { Initials } from './Initials';
import { RoundButton } from './RoundButton';
import { useNow } from './use-now';

export interface CallActions {
  hangup: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  minimise: () => void;
}

export interface CallScreenProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  actions: CallActions;
}

/**
 * The call, full screen like WhatsApp's (docs/28 §5): the big initials, the name, «جارٍ الاتصال…» →
 * «يرنّ…» → the m:ss timer, and كتم / مكبر الصوت / إنهاء (red). Shown in CallOverlay's one Modal, whose
 * back and «تصغير» keep the call going in the bar. The phase is announced on a change only; the
 * ticking timer is not read out. كتم keeps its word and reads out «selected» while on.
 */
export function CallScreen({ session, row, phase, actions }: CallScreenProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(phase === 'active');
  const status = callStatusText(phase, { row, now });
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
        <Initials name={session.name} />
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            fontFamily: type.display,
            fontSize: type.size.h3,
            lineHeight: type.lineHeight(type.size.h3, true),
            color: color.coverInk,
          }}
        >
          {session.name}
        </AppText>
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
          {callPhaseText(phase)}
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
            icon={(ink) => (session.muted ? <MicOffIcon color={ink} /> : <MicIcon color={ink} />)}
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
