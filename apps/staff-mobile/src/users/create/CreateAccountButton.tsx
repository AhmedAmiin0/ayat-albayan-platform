import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { usePermissions, t, Button, Screen, ScreenHeader } from '@ab/mobile-kit';
import { candidatesQuery } from '@/users/shared/api';
import { CreateUserForm } from './CreateUserForm';

export interface CreateAccountButtonProps {
  student: { id: string; name: string; code: string | null };
}

/** Shown only while the student has no login (users.write). */
export function CreateAccountButton({ student }: CreateAccountButtonProps) {
  const can = usePermissions();
  const [open, setOpen] = useState(false);
  const allowed = can('users.write');
  const free = useQuery({ ...candidatesQuery('student', student.code ?? student.name), enabled: allowed });
  // Not an array (older API, a stub): no button rather than crashing the student file.
  if (!allowed || !Array.isArray(free.data) || !free.data.some((c) => c.id === student.id))
    return null;
  const close = () => setOpen(false);
  return (
    <>
      <Button variant="secondary" label={t.users.account.create} onPress={() => setOpen(true)} />
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <Screen sheet>
          <ScreenHeader size="h2" title={t.users.create.title} trailing={<Button variant="ghost" label={t.common.close} onPress={close} />} />
          <ScrollView
            style={{ flex: 1, marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            {open ? (
              <CreateUserForm
                onClose={close}
                prefill={{ role: 'student', linked: { kind: 'student', id: student.id, name: student.name, code: student.code } }}
              />
            ) : null}
          </ScrollView>
        </Screen>
      </Modal>
    </>
  );
}
