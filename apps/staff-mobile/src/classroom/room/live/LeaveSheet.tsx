import { t, AppText, ButtonRow, Button, type, useTheme } from '@ab/mobile-kit';
import { RoomSheet } from './RoomSheet';

const L = t.mobileRoom.leaveAsk;

interface LeaveSheetProps {
  onLeave: () => void;
  onStay: () => void;
}

/**
 * «تغادر الحلقة؟» (canvas RoomXLeave): «غادر» and Android's back ask first, so a slip never drops
 * the lesson; «ابقَ في الحلقة» keeps it.
 */
export function LeaveSheet({ onLeave, onStay }: LeaveSheetProps) {
  const { color } = useTheme();
  return (
    <RoomSheet testID="room-leave" title={L.title}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{L.body}</AppText>
      <ButtonRow>
        <Button variant="danger" label={t.mobileRoom.controls.leave} onPress={onLeave} />
        <Button variant="secondary" label={L.stay} onPress={onStay} />
      </ButtonRow>
    </RoomSheet>
  );
}
