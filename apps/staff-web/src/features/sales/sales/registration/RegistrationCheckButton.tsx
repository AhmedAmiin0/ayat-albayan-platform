import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RegistrationCheckDialog } from './RegistrationCheckDialog';

/** The button alone: the sales chat holds its dialog above the width switch (m13). */
export function RegistrationCheckTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick}>
      <Icon name="search" />
      {t.registrationCheck.action}
    </Button>
  );
}

/** Renders nothing without students.check_registration (the API checks it too). */
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
