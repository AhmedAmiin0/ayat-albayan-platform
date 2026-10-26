import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { HangUpIcon, PhoneIcon } from './call-icons';
import { Initials } from './Initials';
import { RoundButton } from './RoundButton';

export interface IncomingCallProps {
  name: string;
  onAccept: () => void;
  onDecline: () => void;
  /** Android's back: silence the ring (the call stays on screen until answered, declined or ended). */
  onSilence: () => void;
}

/**
 * A family calling the academy's chat number (docs/28 §3.2): full screen, «رفض» (red) and «قبول». Every
 * staff member who may answer that chat sees it; the first «قبول» takes the call and the screen closes
 * for the others. Read out as an alert with the caller's name; no button is focused for them.
 */
export function IncomingCall({ name, onAccept, onDecline, onSilence }: IncomingCallProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="fade" onRequestClose={onSilence} statusBarTranslucent>
      <View testID="incoming-call" accessibilityRole="alert" style={{ flex: 1, backgroundColor: color.cover, alignItems: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhoneIcon color={color.coverInk} size={16} />
          <AppText style={{ fontSize: type.size.sm, color: color.coverInk }}>{t.calls.status.incoming}</AppText>
        </View>
        <View style={{ alignItems: 'center', gap: 16, marginTop: '18%' }}>
          <Initials name={name} />
          <AppText accessibilityRole="header" numberOfLines={1} style={{ fontFamily: type.display, fontSize: type.size.h3, lineHeight: type.lineHeight(type.size.h3, true), color: color.coverInk }}>
            {name}
          </AppText>
        </View>
        <View style={{ marginTop: 'auto', width: '100%', maxWidth: 320, flexDirection: 'row', justifyContent: 'space-between' }}>
          <RoundButton label={t.calls.controls.decline} tone="end" onPress={onDecline} icon={(ink) => <HangUpIcon color={ink} size={26} />} />
          <RoundButton label={t.calls.controls.accept} tone="accept" onPress={onAccept} icon={(ink) => <PhoneIcon color={ink} size={26} />} />
        </View>
      </View>
    </Modal>
  );
}
