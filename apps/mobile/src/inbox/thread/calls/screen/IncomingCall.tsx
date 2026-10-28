import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { HangUpIcon, PhoneIcon } from './call-icons';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { CallerName } from './CallerName';
import { RoundButton } from './RoundButton';

interface IncomingCallProps {
  name: string;
  /** The caller's number (E.164): seeds the tone, as on the chat rows. */
  phone: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * A family calling the academy's chat number (docs/28 §3.2): full screen, «رفض» (red) and «قبول». Every
 * staff member who may answer that chat sees it; the first «قبول» takes the call and the screen closes
 * for the others. Read out as an alert with the caller's name; no button is focused for them. Shown in
 * CallOverlay's one Modal (its back silences the ring).
 */
export function IncomingCall({ name, phone, onAccept, onDecline }: IncomingCallProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="incoming-call"
      accessibilityRole="alert"
      style={{
        flex: 1,
        backgroundColor: color.cover,
        alignItems: 'center',
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PhoneIcon color={color.coverInk} size={16} />
        <AppText style={{ fontSize: type.size.sm, color: color.coverInk }}>
          {t.calls.status.incoming}
        </AppText>
      </View>
      <View style={{ alignItems: 'center', gap: 16, marginTop: '18%' }}>
        <Avatar name={name} id={phone} size="xl" decorative />
        <CallerName name={name} />
      </View>
      <View
        style={{
          marginTop: 'auto',
          width: '100%',
          maxWidth: 320,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <RoundButton
          label={t.calls.controls.decline}
          tone="end"
          onPress={onDecline}
          icon={(ink) => <HangUpIcon color={ink} size={26} />}
        />
        <RoundButton
          label={t.calls.controls.accept}
          tone="accept"
          onPress={onAccept}
          icon={(ink) => <PhoneIcon color={ink} size={26} />}
        />
      </View>
    </View>
  );
}
