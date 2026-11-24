import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, type, useTheme, AppText, Avatar, HangUpIcon, PhoneIcon, RoundButton } from '@ab/mobile-kit';
import { CallerName } from './CallerName';

interface IncomingCallProps {
  name: string;
  /** The caller's number (E.164): seeds the tone, as on the chat rows. */
  phone: string;
  onAccept: () => void;
  onDecline: () => void;
}

/** docs/28 §3.2: every staff member who may answer sees it; the first accept takes the call. */
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
