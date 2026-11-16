import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { ChannelThread } from '@/features/teaching/student-channel/ChannelThread';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { useSeatWatch, type ChannelSeatApi } from './use-channel-seat';

interface SeatChatDialogProps {
  studentId: string;
  /** '' from a chat notification: the thread names the student itself. */
  studentName: string;
  seat: ChannelSeatApi;
  onClose: () => void;
}

/**
 * The seat holder's chat panel (owner 2026-11-16): the student's chat, where she writes (a closed
 * channel stays read-only), and «مغادرة المحادثة», which frees the seat and closes the panel. It
 * re-reads the seat while open: taken over by the student's bringer, it closes.
 */
export function SeatChatDialog({ studentId, studentName, seat, onClose }: SeatChatDialogProps) {
  const tz = useViewerTz();
  useSeatWatch(studentId);
  const title = [t.studentChannel.monitorTitle, studentName].filter(Boolean).join(' · ');
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={seat.leave.isPending}
          onClick={() => seat.leave.mutate(undefined, { onSuccess: onClose })}
        >
          {t.studentChannel.seat.leave}
        </Button>
      </div>
      <ChannelThread refs={{ audience: 'sales', studentId }} tz={tz} named={!studentName} />
    </Dialog>
  );
}
