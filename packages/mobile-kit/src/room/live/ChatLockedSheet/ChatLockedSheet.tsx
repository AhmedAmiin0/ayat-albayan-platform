import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText, Button, Sheet } from '../../../ui';
import type { ChatLockedSheetProps } from './ChatLockedSheet.types';

/** In a trial lesson the chat opens only after subscribing. */
export function ChatLockedSheet({ open, onClose }: ChatLockedSheetProps) {
  const { color } = useTheme();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      surface="page"
      label={t.mobileRoom.controls.chat}
      title={t.mobileRoom.controls.chat}
      testID="room-chat-locked"
    >
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
        {t.studentChannel.closed}
      </AppText>
      <Button variant="ghost" label={t.common.close} onPress={onClose} />
    </Sheet>
  );
}
