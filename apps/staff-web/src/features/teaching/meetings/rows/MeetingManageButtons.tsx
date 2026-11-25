import type { MeetingView } from '@ab/schedule';
import { Button, t } from '@ab/web-kit';
import type { RowDialog } from './MeetingRowDialogs';

const M = t.meetingInvites.list;

export function MeetingManageButtons({
  meeting,
  onOpen,
}: {
  meeting: MeetingView;
  onOpen: (dialog: RowDialog) => void;
}) {
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
