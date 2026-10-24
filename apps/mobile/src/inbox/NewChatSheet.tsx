import { normalizePhone } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { ErrorLine } from './ErrorLine';
import { threadHref } from './thread-cache';

/**
 * «محادثة جديدة» (admin and sales, the web inbox's form): type a family's WhatsApp number and open its
 * thread. A number without messages opens with the template sheet (the first message is a template).
 */
export function NewChatSheet() {
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
      <Button variant="ghost" label={t.inbox.newChat.title} onPress={() => setOpen(true)} />
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
