import { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Screen } from '@/core/ui/layout/Screen';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { ComposeIcon } from '@/inbox/shared/chat-icons';
import { NewChatSteps } from './new-chat/NewChatSteps';

/** The floating button's size; the chats list leaves this much room (plus 16pt) under its last row. */
export const FAB = 56;

/**
 * «محادثة جديدة» (admin and sales): one sheet with steps, like Kapso (NewChatSteps): the number, then
 * for a new number its allowed templates, the params and «أرسل»; a number with a chat opens it.
 * The trigger floats as a 56pt round button in the chats list's bottom inline-end corner, above the
 * tab bar, as WhatsApp (owner 2026-10-27: «Remove new chat from the top and make it a floating circle
 * icon in the bottom corner»). Render it last inside the list's frame: it is absolutely placed.
 */
export function NewChatSheet() {
  const { color, elevation } = useTheme();
  const inset = useTabBarInset();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Pressable
        testID="new-chat-fab"
        accessibilityRole="button"
        accessibilityLabel={t.inbox.newChat.title}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          end: 0,
          bottom: inset + 16,
          width: FAB,
          height: FAB,
          borderRadius: FAB / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? color.lapisHover : color.lapisFill,
          boxShadow: elevation.toast,
        })}
      >
        <ComposeIcon color={color.onLapis} size={24} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <Screen sheet>{open ? <NewChatSteps onClose={close} /> : null}</Screen>
      </Modal>
    </>
  );
}
