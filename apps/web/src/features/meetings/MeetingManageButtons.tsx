import type { MeetingView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import type { RowDialog } from './MeetingRowDialogs';

const M = t.meetingInvites.list;

/** The creator's (or an admin's) dialogs: «غيّر الموعد» / «ألغِ الاجتماع» while a scheduled one is live, «المدعوون», «التسجيلات». */
export function MeetingManageButtons({ meeting, onOpen }: { meeting: MeetingView; onOpen: (dialog: RowDialog) => void }) {
  if (!meeting.can_manage) return null;
  const live = meeting.state === 'open' && !meeting.cancelled_at && meeting.starts_at !== null;
  return (
    <>
      {live && (
        <Button type="button" variant="secondary" onClick={() => onOpen('reschedule')}>{M.reschedule}</Button>
      )}
      {live && (
        <Button type="button" variant="danger-quiet" onClick={() => onOpen('cancel')}>{M.cancel}</Button>
      )}
      <Button type="button" variant="secondary" onClick={() => onOpen('invitees')}>{M.invitees}</Button>
      <Button type="button" variant="secondary" onClick={() => onOpen('recordings')}>{t.classroom.recordings.title}</Button>
    </>
  );
}
