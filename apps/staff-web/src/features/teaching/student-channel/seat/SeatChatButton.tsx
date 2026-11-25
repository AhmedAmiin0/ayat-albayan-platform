import { useState } from 'react';
import { Button, t } from '@ab/web-kit';
import { SeatChatDialog } from './SeatChatDialog';
import type { ChannelSeatApi } from './use-channel-seat';

interface SeatChatButtonProps {
  studentId: string;
  studentName: string;
  seat: ChannelSeatApi;
}

export function SeatChatButton({ studentId, studentName, seat }: SeatChatButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.studentChannel.open}
      </Button>
      {open && (
        <SeatChatDialog
          studentId={studentId}
          studentName={studentName}
          seat={seat}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
