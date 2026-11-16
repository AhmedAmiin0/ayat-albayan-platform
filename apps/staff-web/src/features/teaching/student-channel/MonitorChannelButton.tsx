import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { SalesChannelDialog } from './SalesChannelDialog';

/**
 * The owning assistant's «المحادثة» on a row of «طلابي»: the student's channel in a panel, where
 * she writes too (owner 2026-11-16); a closed channel stays read-only.
 */
interface Props {
  studentId: string;
  studentName: string;
}

export function MonitorChannelButton({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.studentChannel.open}
      </Button>
      {open && (
        <SalesChannelDialog
          studentId={studentId}
          studentName={studentName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
