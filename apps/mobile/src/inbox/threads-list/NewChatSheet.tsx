import { normalizePhone } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { useTheme } from '@/theme';
import { Field } from '@/core/ui/form/Field';
import { Screen } from '@/core/ui/layout/Screen';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ErrorLine } from '../ErrorLine';
import { ComposeIcon } from '../shared/chat-icons';
import { threadHref } from '../thread/hooks/thread-cache';

/** The floating button's size; the chats list leaves this much room (plus 16pt) under its last row. */
export const FAB = 56;

/**
 * «محادثة جديدة» (admin and sales, the web inbox's form): type a family's WhatsApp number and open its
 * thread. A number without messages opens with the template sheet (the first message is a template).
 * The trigger floats as a 56pt round button in the chats list's bottom inline-end corner, above the
 * tab bar, as WhatsApp (owner 2026-10-27: «Remove new chat from the top and make it a floating circle
 * icon in the bottom corner»). Render it last inside the list's frame: it is absolutely placed.
 */
export function NewChatSheet() {
  const { color, elevation } = useTheme();
  const inset = useTabBarInset();
  const [open, setOpen] = useState(false);
  const base = useTreeBase();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
  };
  const submit = () => {
    const phone = normalizePhone(value);
    if (!phone.ok) {
      setError(t.common.phoneErrors[phone.reason]);
      return;
    }
    setValue('');
    close();
    router.push(inTree(base, threadHref(phone.e164)));
  };
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
        <Screen sheet>
          <ScreenHeader title={t.inbox.newChat.title} trailing={<Button variant="ghost" label={t.common.close} onPress={close} />} />
          <View style={{ gap: 12 }}>
            <Field
              ltr
              label={t.inbox.newChat.phone}
              placeholder={t.inbox.newChat.placeholder}
              keyboardType="phone-pad"
              autoComplete="off"
              value={value}
              onChangeText={setValue}
              onSubmitEditing={submit}
            />
            {error ? <ErrorLine message={error} /> : <Note>{t.inbox.newChat.hint}</Note>}
            <Button label={t.inbox.newChat.open} onPress={submit} />
          </View>
        </Screen>
      </Modal>
    </>
  );
}
