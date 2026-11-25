import type { MeetingView } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, buttonVariants, FormAlert, t } from '@ab/web-kit';
import { copyText, endMeeting, MEETINGS_KEY, newMeetingLink } from '@/features/teaching/meetings/internal/internal-api';
import { MeetingLinkBox } from './MeetingLinkBox';
import { MeetingManageButtons } from './MeetingManageButtons';
import { MeetingRowDialogs, type RowDialog } from './MeetingRowDialogs';
import { MeetingRowInfo } from './MeetingRowInfo';

const L = t.meetings.internal;
const M = t.meetingInvites.list;

/** Join only inside its window (can_join); management for its creator or an admin. */
export function MeetingRow({ meeting, tz }: { meeting: MeetingView; tz: string }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: MEETINGS_KEY });
  const end = useMutation({ mutationFn: endMeeting, onSuccess: refresh });
  const link = useMutation({
    mutationFn: async (id: string) => {
      const made = await newMeetingLink(id);
      await copyText(made.url);
      return made.url;
    },
  });
  const [dialog, setDialog] = useState<RowDialog | null>(null);
  const manage = meeting.can_manage && meeting.state === 'open' && !meeting.cancelled_at;
  return (
    <li className="grid gap-2 border-b border-rule py-3">
      <div className="flex flex-wrap items-center gap-2">
        <MeetingRowInfo meeting={meeting} tz={tz} />
        <div className="ms-auto flex flex-wrap gap-2">
          {meeting.can_join && (
            <a href={`/meeting/${meeting.id}`} className={buttonVariants({ variant: 'primary' })}>
              {M.enter}
            </a>
          )}
          {manage && (
            <Button type="button" variant="secondary" title={L.newLinkHint} disabled={link.isPending} onClick={() => link.mutate(meeting.id)}>
              {L.newLink}
            </Button>
          )}
          {manage && meeting.starts_at === null && (
            <Button type="button" variant="ghost" disabled={end.isPending} onClick={() => end.mutate(meeting.id)}>
              {L.end}
            </Button>
          )}
          <MeetingManageButtons meeting={meeting} onOpen={setDialog} />
        </div>
      </div>
      {link.data && <MeetingLinkBox url={link.data} note={L.copied} />}
      {(end.isError || link.isError) && <FormAlert>{L.actionError}</FormAlert>}
      <MeetingRowDialogs meeting={meeting} open={dialog} tz={tz} onClose={() => setDialog(null)} />
    </li>
  );
}
