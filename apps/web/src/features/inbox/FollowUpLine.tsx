import { FOLLOW_UP_STATUSES } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { settingsQuery } from '@/features/messaging/api';
import { t } from '@/lib/i18n';
import { setFollowUpPaused, type InboxLead } from './api';
import { fullTime } from './format';

export interface FollowUpLineProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

const statuses: readonly string[] = FOLLOW_UP_STATUSES;

/** What the follow-up automation will do next (R-LEAD-05), and the per-lead pause (L2). */
function stateText(lead: InboxLead, total: number | undefined): string[] {
  if (lead.follow_up_paused) return [t.followUps.paused];
  const lines: string[] = [];
  if (lead.next_follow_up_at && statuses.includes(lead.status)) {
    lines.push(t.followUps.next.replace('{time}', fullTime(lead.next_follow_up_at)));
  } else lines.push(t.followUps.none);
  if (lead.follow_up_stage > 0 && total) {
    lines.push(t.followUps.stage.replace('{n}', String(lead.follow_up_stage)).replace('{total}', String(total)));
  }
  return lines;
}

/** The hamish note of the thread: the next automatic follow-up, or why there is none. */
export function FollowUpLine({ lead, onDone }: FollowUpLineProps) {
  const queryClient = useQueryClient();
  const settings = useQuery(settingsQuery);
  const pause = useMutation({
    mutationFn: setFollowUpPaused,
    onSuccess: async () => {
      onDone(t.inbox.followUpSaved);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: () => onDone(t.common.error, 'error'),
  });

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">{t.followUps.title}</h3>
      <div className="border-s-[3px] border-double border-s-gold-soft ps-3 text-xs text-ink-2">
        {stateText(lead, settings.data?.follow_up_hours.length).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        disabled={pause.isPending}
        onClick={() => pause.mutate({ id: lead.id, paused: !lead.follow_up_paused })}
      >
        {lead.follow_up_paused ? t.followUps.resume : t.followUps.pause}
      </Button>
    </div>
  );
}
