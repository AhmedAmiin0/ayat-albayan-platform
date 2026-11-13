import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { InternalMeetingDialog } from './InternalMeetingDialog';
import { ScheduledMeetingDialog } from '@/features/teaching/meetings/scheduled/ScheduledMeetingDialog';

type Props = {
  /** «اجتماع داخلي» shows (default true; only the teacher's page passes its switch). */
  instant?: boolean;
  /** «اجتماع مجدول» shows (default true). */
  scheduled?: boolean;
};

/**
 * «اجتماع داخلي» (now) and «اجتماع مجدول» (a time and invitees) on their own (teacher, assistant and
 * sales pages, where the admin's «اجتماع جديد» menu with the booking wizard does not belong).
 */
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
