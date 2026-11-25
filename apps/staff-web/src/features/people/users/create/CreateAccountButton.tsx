import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, usePermissions, t } from '@ab/web-kit';
import { candidatesQuery } from '@/features/people/users/api';
import { CreateUserDialog } from './CreateUserDialog';

export interface CreateAccountButtonProps {
  student: { id: string; name: string; code: string | null };
}

/** Needs users.write and students.write; shown only while the student has no login. */
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
