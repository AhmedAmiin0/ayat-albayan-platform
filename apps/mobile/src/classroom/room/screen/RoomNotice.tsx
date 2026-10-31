import { ActivityIndicator, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';

interface RoomNoticeProps {
  testID: string;
  message: string;
  /** A wait (checking, joining): a spinner and no buttons. */
  busy?: boolean;
  /** «حاول مرة أخرى» / «ادخل مرة أخرى»; absent when there is no way back in (removed). */
  again?: { label: string; onPress: () => void };
  onBack?: () => void;
}

/**
 * A step with one line: connecting, a failure, or the room closed (ended, removed, opened
 * elsewhere).
 */
export function RoomNotice({ testID, message, busy, again, onBack }: RoomNoticeProps) {
  const { color } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 16,
        backgroundColor: color.cover,
      }}
    >
      {busy ? <ActivityIndicator color={color.coverInk} /> : null}
      <AppText
        accessibilityLiveRegion="polite"
        style={{ textAlign: 'center', fontSize: type.size.base, color: color.coverInk }}
      >
        {message}
      </AppText>
      {again ? <Button label={again.label} onPress={again.onPress} /> : null}
      {onBack && !busy ? (
        <Button label={t.mobileRoom.back} variant="secondary" onPress={onBack} />
      ) : null}
    </View>
  );
}
