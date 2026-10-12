import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { InternalMeetingDialog } from './InternalMeetingDialog';
import { ScheduledMeetingDialog } from './ScheduledMeetingDialog';

/**
 * «اجتماع داخلي» (now) and «اجتماع مجدول» (a time and invitees) on their own (teacher, assistant and
 * sales pages, where the admin's «اجتماع جديد» menu with the booking wizard does not belong).
 */
export function InternalMeetingButton() {
  const [open, setOpen] = useState<'instant' | 'scheduled' | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => setOpen('instant')}>
        <Icon name="plus" />
        {t.meetings.internal.item}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen('scheduled')}>
        <Icon name="calendar" />
        {t.meetingInvites.scheduledItem}
      </Button>
      {open === 'instant' && <InternalMeetingDialog onClose={() => setOpen(null)} />}
      {open === 'scheduled' && <ScheduledMeetingDialog onClose={() => setOpen(null)} />}
    </div>
  );
}
