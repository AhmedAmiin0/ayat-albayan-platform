import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';
import { CreateUserDialog } from './CreateUserDialog';

export interface CreateAccountButtonProps {
  student: { id: string; name: string; code: string | null };
}

/**
 * «إنشاء حساب» on the student profile (users.write): the create dialog with the student's own
 * record already picked. A student who already has a login is refused by the API (link_taken).
 */
export function CreateAccountButton({ student }: CreateAccountButtonProps) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  if (!can('users.write')) return null;
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t.users.account.create}
      </Button>
      {open && (
        <CreateUserDialog
          onClose={() => setOpen(false)}
          prefill={{ role: 'student', linked: { kind: 'student', id: student.id, name: student.name, code: student.code } }}
        />
      )}
    </>
  );
}
