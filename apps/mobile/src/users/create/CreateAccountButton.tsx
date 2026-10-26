import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { candidatesQuery } from '../shared/api';
import { CreateUserForm } from './CreateUserForm';

export interface CreateAccountButtonProps {
  student: { id: string; name: string; code: string | null };
}

/**
 * «إنشاء حساب» on the student file (users.write), as on the web: the create form in a page sheet
 * with the student's own record already picked. Shown only while the student has no login: the
 * link candidates are the students without one.
 */
export function CreateAccountButton({ student }: CreateAccountButtonProps) {
  const can = usePermissions();
  const [open, setOpen] = useState(false);
  const allowed = can('users.write');
  const free = useQuery({ ...candidatesQuery('student', student.code ?? student.name), enabled: allowed });
  // Not an array (an older API, a stubbed answer): no button rather than a crash of the student file.
  if (!allowed || !Array.isArray(free.data) || !free.data.some((c) => c.id === student.id)) return null;
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
