import { View } from 'react-native';
import { t, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import { RoomSheet } from './RoomSheet';

const L = t.mobileRoom.leaveAsk;

interface LeaveSheetProps {
  onLeave: () => void;
  onStay: () => void;
}

/**
 * «تغادر الحلقة؟» (canvas RoomXLeave): «غادر» and Android's back ask first, so a slip never drops
 * the lesson. Stacked full width: «غادر» (danger) first, then «ابقَ في الحلقة».
 */
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
