import type { ChannelMessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { MenuSheet } from '../../ui/feedback/MenuSheet';
import type { ChannelRef } from '../channel-api';
import { ChannelMenuSteps, type MenuExits } from './ChannelMenuSteps';
import type { MenuOffers } from './menu-offers';
import { useKeyboardInset } from './use-keyboard-inset';

interface ChannelMessageMenuProps extends MenuExits {
  refs: ChannelRef;
  /** The long-pressed message and what it offers now; null hides the menu. */
  held: { message: ChannelMessageView; offers: MenuOffers } | null;
}

/**
 * A long press on a channel bubble (ChatXMenu): «رد», «تعديل» (the sender, 15 minutes), «حذف
 * للجميع» (the sender, 48 hours; the admin any message) and «معلومات الرسالة», only what menuOffers
 * allows now; the scrim closes it. The sheet rises over the keyboard while the edit box has it.
 */
export function ChannelMessageMenu({ refs, held, ...exits }: ChannelMessageMenuProps) {
  const inset = useKeyboardInset();
  return (
    <MenuSheet
      open={held !== null}
      label={t.studentChannel.actions.menu}
      testID="channel-message-menu"
      onClose={exits.onClose}
    >
      <View style={{ gap: 8, paddingBottom: inset }}>
        {held ? (
          <ChannelMenuSteps refs={refs} message={held.message} offers={held.offers} {...exits} />
        ) : null}
      </View>
    </MenuSheet>
  );
}
