import { useState } from 'react';
import { Button, Icon, t } from '@ab/web-kit';
import { InternalMeetingDialog } from './InternalMeetingDialog';
import { ScheduledMeetingDialog } from '@/features/teaching/meetings/scheduled/ScheduledMeetingDialog';

interface Props {
  /** Defaults true; only the teacher's page passes its switch. */
  instant?: boolean;
  scheduled?: boolean;
}

/** For pages where the admin's new-meeting menu with the booking wizard does not belong. */
export function InternalMeetingButton({ instant = true, scheduled = true }: Props) {
  const [open, setOpen] = useState<'instant' | 'scheduled' | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {instant && (
        <Button type="button" variant="secondary" onClick={() => setOpen('instant')}>
          <Icon name="plus" />
          {t.meetings.internal.item}
        </Button>
      )}
      {scheduled && (
        <Button type="button" variant="secondary" onClick={() => setOpen('scheduled')}>
          <Icon name="calendar" />
          {t.meetingInvites.scheduledItem}
        </Button>
      )}
      {open === 'instant' && <InternalMeetingDialog onClose={() => setOpen(null)} />}
      {open === 'scheduled' && <ScheduledMeetingDialog onClose={() => setOpen(null)} />}
    </div>
  );
}
