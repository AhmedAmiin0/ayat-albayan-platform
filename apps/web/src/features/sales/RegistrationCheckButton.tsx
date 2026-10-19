import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';
import { RegistrationCheckDialog } from './RegistrationCheckDialog';

/** The «تحقق من التسجيل» button alone: the sales chat holds its dialog above the width switch (m13). */
export function RegistrationCheckTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick}>
      <Icon name="search" />
      {t.registrationCheck.action}
    </Button>
  );
}

/**
 * «تحقق من التسجيل» («الطلاب» page): opens the check, prefilled with `phone` when given. Renders
 * nothing without students.check_registration (the API checks it too).
 */
export function RegistrationCheckButton({ phone }: { phone?: string }) {
  const [open, setOpen] = useState(false);
  if (!usePermissions().can('students.check_registration')) return null;
  return (
    <>
      <RegistrationCheckTrigger onClick={() => setOpen(true)} />
      {open && <RegistrationCheckDialog phone={phone} onClose={() => setOpen(false)} />}
    </>
  );
}
