import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { useSeatWatch, type ChannelSeatApi } from './use-channel-seat';

interface SeatChatDialogProps {
  studentId: string;
  /** '' from a chat notification: the thread names the student itself. */
  studentName: string;
  seat: ChannelSeatApi;
  onClose: () => void;
}

/** Leaving frees the seat; re-reads while open and closes if the bringer takes it over. */
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
