import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { ChannelThread } from '@/features/teaching/student-channel/ChannelThread';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import type { ChannelSeatApi } from './use-channel-seat';

interface SeatChatButtonProps {
  studentId: string;
  studentName: string;
  seat: ChannelSeatApi;
}

/**
 * The seat holder's «المحادثة» (owner 2026-11-16): the student's chat in a panel, where she
 * writes (a closed channel stays read-only), and «مغادرة المحادثة», which frees the seat for
 * another assistant and closes the panel.
 */
export function SeatChatButton({ studentId, studentName, seat }: SeatChatButtonProps) {
  const tz = useViewerTz();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.studentChannel.open}
      </Button>
      {open && (
        <Dialog title={`${t.studentChannel.monitorTitle} · ${studentName}`} onClose={close}>
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={seat.leave.isPending}
              onClick={() => seat.leave.mutate(undefined, { onSuccess: close })}
            >
              {t.studentChannel.seat.leave}
            </Button>
          </div>
          <ChannelThread refs={{ audience: 'sales', studentId }} tz={tz} />
        </Dialog>
      )}
    </>
  );
}
