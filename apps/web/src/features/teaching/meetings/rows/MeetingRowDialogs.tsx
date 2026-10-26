import type { MeetingView } from '@ab/shared';
import { RecordingsPanel } from '@/features/teaching/classroom/recordings/RecordingsPanel';
import { CancelMeetingDialog } from './CancelMeetingDialog';
import { MeetingInviteesDialog } from '../invitees/MeetingInviteesDialog';
import { RescheduleDialog } from '../scheduled/RescheduleDialog';

export type RowDialog = 'reschedule' | 'cancel' | 'invitees' | 'recordings';

interface Props {
  meeting: MeetingView;
  open: RowDialog | null;
  tz: string;
}

/** The one dialog a meeting row has open (reschedule, cancel confirm, invitees, recordings). */
export function MeetingRowDialogs({ meeting, open, tz, onClose }: Props & { onClose: () => void }) {
  const startsAt = meeting.starts_at;
  if (open === 'reschedule' && startsAt) return <RescheduleDialog meeting={{ ...meeting, starts_at: startsAt }} tz={tz} onClose={onClose} />;
  if (open === 'cancel') return <CancelMeetingDialog meetingId={meeting.id} onClose={onClose} />;
  if (open === 'invitees') return <MeetingInviteesDialog meetingId={meeting.id} title={meeting.title} onClose={onClose} />;
  if (open === 'recordings') return <RecordingsPanel source={{ kind: 'meeting', id: meeting.id }} onClose={onClose} />;
  return null;
}
