import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n/i18n';
import { candidatesQuery } from './api';
import { CreateUserDialog } from './CreateUserDialog';

export interface CreateAccountButtonProps {
  student: { id: string; name: string; code: string | null };
}

/**
 * «إنشاء حساب» on the student profile (users.write + students.write): the create dialog with the
 * student's own record already picked. Shown only while the student has no login: the link
 * candidates are the students without one, so a student that is not among them already has it.
 */
export function CreateAccountButton({ student }: CreateAccountButtonProps) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const allowed = can('users.write');
  const free = useQuery({ ...candidatesQuery('student', student.code ?? student.name), enabled: allowed });
  if (!allowed || !free.data?.some((c) => c.id === student.id)) return null;
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
