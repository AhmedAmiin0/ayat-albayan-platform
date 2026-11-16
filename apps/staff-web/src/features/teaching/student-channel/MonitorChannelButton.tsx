import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { ChannelThread } from './ChannelThread';

/**
 * The owning assistant's «المحادثة» on a row of «طلابي»: the student's channel in a panel, where
 * she writes too (owner 2026-11-16); a closed channel stays read-only.
 */
export function MonitorChannelButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const tz = useViewerTz();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.studentChannel.open}
      </Button>
      {open && (
        <Dialog title={`${t.studentChannel.monitorTitle} · ${studentName}`} onClose={() => setOpen(false)}>
          <ChannelThread refs={{ audience: 'sales', studentId }} tz={tz} />
        </Dialog>
      )}
    </>
  );
}
