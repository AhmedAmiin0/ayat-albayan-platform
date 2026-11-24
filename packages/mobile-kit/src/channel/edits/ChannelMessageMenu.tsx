import type { ChannelMessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { MenuSheet } from '../../ui/feedback/MenuSheet';
import type { ChannelRef } from '../channel-api';
import { ChannelMenuSteps, type MenuExits } from './ChannelMenuSteps';
import type { MenuOffers } from '@ab/client-core';
import { useKeyboardInset } from './use-keyboard-inset';

interface ChannelMessageMenuProps extends MenuExits {
  refs: ChannelRef;
  /** The long-pressed message and what it offers now; null hides the menu. */
  held: { message: ChannelMessageView; offers: MenuOffers } | null;
}

/** Edit is the sender's for 15 minutes; delete the sender's for 48 hours, or the admin's any. */
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
