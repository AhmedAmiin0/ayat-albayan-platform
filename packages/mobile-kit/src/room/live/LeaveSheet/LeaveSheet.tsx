import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Button, Sheet } from '../../../ui';
import { type, useTheme } from '../../../theme';
import type { LeaveSheetProps } from './LeaveSheet.types';

/**
 * Leave and Android back ask first so a slip never drops the lesson: a drag down, the scrim or
 * back while asking means stay.
 */
export function LeaveSheet({ open, onLeave, onStay }: LeaveSheetProps) {
  const { color } = useTheme();
  return (
    <Sheet
      open={open}
      onClose={onStay}
      surface="page"
      label={t.mobileRoom.leaveAsk.title}
      title={t.mobileRoom.leaveAsk.title}
      testID="room-leave"
    >
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
        {t.mobileRoom.leaveAsk.body}
      </AppText>
      <View style={{ gap: 8 }}>
        <Button variant="danger" label={t.mobileRoom.controls.leave} onPress={onLeave} />
        <Button variant="secondary" label={t.mobileRoom.leaveAsk.stay} onPress={onStay} />
      </View>
    </Sheet>
  );
}
