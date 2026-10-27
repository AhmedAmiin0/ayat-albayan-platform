import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { viewerTz } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { ChannelThread } from './ChannelThread';

/** The owning assistant's «المحادثة» on a row of «طلابي»: the student's channel, read-only, in a panel. */
export function MonitorChannelButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.studentChannel.open}
      </Button>
      {open && (
        <Dialog title={`${t.studentChannel.monitorTitle} · ${studentName}`} onClose={() => setOpen(false)}>
          <ChannelThread refs={{ audience: 'sales', studentId }} tz={viewerTz()} />
        </Dialog>
      )}
    </>
  );
}
