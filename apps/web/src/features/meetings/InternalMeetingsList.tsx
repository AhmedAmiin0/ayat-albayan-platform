import type { MeetingView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { copyText, endMeeting, meetingsQuery, MEETINGS_KEY, newMeetingLink } from './internal-api';
import { MeetingLinkBox } from './MeetingLinkBox';

const L = t.meetings.internal;
const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

function Row({ meeting }: { meeting: MeetingView }) {
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
  const open = meeting.state === 'open';
  const manage = open && meeting.can_manage;
  return (
    <li className="grid gap-2 border-b border-rule py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-semibold">{meeting.title}</p>
        <span className="text-xs text-ink-3">{open ? L.open : L.ended}</span>
        <span dir="ltr" className="text-xs tabular-nums text-ink-3">{WHEN.format(new Date(meeting.created_at))}</span>
        <div className="ms-auto flex flex-wrap gap-2">
          {open && (
            <a href={`/meeting/${meeting.id}`} className={buttonVariants({ variant: 'primary' })}>
              {L.enter}
            </a>
          )}
          {manage && (
            <Button type="button" variant="secondary" title={L.newLinkHint} disabled={link.isPending} onClick={() => link.mutate(meeting.id)}>
              {L.newLink}
            </Button>
          )}
          {manage && (
            <Button type="button" variant="ghost" disabled={end.isPending} onClick={() => end.mutate(meeting.id)}>
              {L.end}
            </Button>
          )}
        </div>
      </div>
      {link.data && <MeetingLinkBox url={link.data} note={L.copied} />}
      {(end.isError || link.isError) && <FormAlert>{L.actionError}</FormAlert>}
    </li>
  );
}

/** «الاجتماعات الداخلية»: the newest 20 (all for an admin, else my own), each with enter, a new link and end. */
export function InternalMeetingsList() {
  const meetings = useQuery(meetingsQuery);
  return (
    <section aria-label={L.list} className="mt-8">
      <h2 className="mb-2 font-display text-h3 font-bold">{L.list}</h2>
      {meetings.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {meetings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {meetings.isSuccess && meetings.data.length === 0 && <p className="text-sm text-ink-3">{L.empty}</p>}
      <ul>
        {(meetings.data ?? []).map((m) => (
          <Row key={m.id} meeting={m} />
        ))}
      </ul>
    </section>
  );
}
