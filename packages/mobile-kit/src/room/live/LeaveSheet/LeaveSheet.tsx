import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Button } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { RoomSheet } from '../RoomSheet';

const L = t.mobileRoom.leaveAsk;

interface LeaveSheetProps {
  onLeave: () => void;
  onStay: () => void;
}

/** Leave and Android back ask first so a slip never drops the lesson. */
export function LeaveSheet({ onLeave, onStay }: LeaveSheetProps) {
  const { color } = useTheme();
  return (
    <RoomSheet testID="room-leave" title={L.title}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{L.body}</AppText>
      <View style={{ gap: 8 }}>
        <Button variant="danger" label={t.mobileRoom.controls.leave} onPress={onLeave} />
        <Button variant="secondary" label={L.stay} onPress={onStay} />
      </View>
    </RoomSheet>
  );
}
