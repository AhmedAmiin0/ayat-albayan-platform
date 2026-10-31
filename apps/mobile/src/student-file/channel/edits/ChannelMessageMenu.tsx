import type { ChannelMessageView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { MenuSheet } from '@/core/ui/feedback/MenuSheet';
import { Button } from '@/core/ui/primitives/Button';
import type { ChannelRef } from '@/student-file/channel/channel-queries';
import { ChannelMenuSteps } from './ChannelMenuSteps';

interface ChannelMessageMenuProps {
  refs: ChannelRef;
  /** The long-pressed message; null hides the menu. */
  message: ChannelMessageView | null;
  onClose: () => void;
}

/**
 * A long press on a channel bubble (owner 2026-10-30): «تعديل» (the sender, 15 minutes) and «حذف
 * للجميع» (the sender, 48 hours; the admin any message), only what channelBubbleActions allows now.
 */
export function ChannelMessageMenu({ refs, message: m, onClose }: ChannelMessageMenuProps) {
  return (
    <MenuSheet
      open={m !== null}
      label={t.studentChannel.actions.menu}
      testID="channel-message-menu"
      onClose={onClose}
    >
      {m ? <ChannelMenuSteps refs={refs} message={m} onClose={onClose} /> : null}
      <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
    </MenuSheet>
  );
}
