import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';
import { RegistrationCheckDialog } from './RegistrationCheckDialog';

/**
 * «تحقق من التسجيل» (sales chat header, «الطلاب» page): opens the check, prefilled with the chat's
 * number. Renders nothing without students.check_registration (the API checks it too).
 */
export function RegistrationCheckButton({ phone }: { phone?: string }) {
  const [open, setOpen] = useState(false);
  if (!usePermissions().can('students.check_registration')) return null;
  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="search" />
        {t.registrationCheck.action}
      </Button>
      {open && <RegistrationCheckDialog phone={phone} onClose={() => setOpen(false)} />}
    </>
  );
}
