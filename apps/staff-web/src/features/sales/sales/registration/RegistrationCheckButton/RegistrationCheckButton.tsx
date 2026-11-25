import { useState } from 'react';
import { Button, Icon, usePermissions, t } from '@ab/web-kit';
import { RegistrationCheckDialog } from '@/features/sales/sales/registration/RegistrationCheckDialog';

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
