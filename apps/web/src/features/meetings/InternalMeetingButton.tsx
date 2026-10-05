import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { InternalMeetingDialog } from './InternalMeetingDialog';

/**
 * «اجتماع داخلي» on its own (teacher, assistant and sales homes, where the admin's «اجتماع جديد»
 * menu with the booking wizard does not belong): opens the creation dialog.
 */
export function InternalMeetingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        {t.meetings.internal.item}
      </Button>
      {open && <InternalMeetingDialog onClose={() => setOpen(false)} />}
    </>
  );
}
