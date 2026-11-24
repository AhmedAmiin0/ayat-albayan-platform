import { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { t, useTheme, Screen, useTabBarInset } from '@ab/mobile-kit';
import { ComposeIcon } from '@/inbox/shared/chat-icons';
import { NewChatSteps } from './new-chat/NewChatSteps';

/** The floating button's size; the chats list leaves this much room (plus 16pt) under its last row. */
export const FAB = 56;

/** Admin and sales only; render it last inside the list's frame so it floats above. */
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
