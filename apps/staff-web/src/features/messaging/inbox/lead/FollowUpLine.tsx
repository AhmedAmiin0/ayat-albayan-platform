import { FOLLOW_UP_STATUSES } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { settingsQuery } from '@/lib/settings/settings-api';
import { setFollowUpPaused, type InboxLead } from '@/features/messaging/inbox/api/api';
import { fullTime } from '@/features/messaging/inbox/format';
import { useClock, type Clock } from '@/lib/clock';

export interface FollowUpLineProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

const statuses: readonly string[] = FOLLOW_UP_STATUSES;
const f = t.followUps;
const NOTES = { queued: f.queued, waiting_template: f.waitingTemplate, no_slots: f.noSlots } as const;

/**
 * What the follow-up automation will do next (R-LEAD-05): who paused it, or why the due one has
 * not gone out (in the queue, waiting for Meta's approval, no free slots), else when it is due.
 */
export function followUpText(lead: InboxLead, total: number | undefined, clock: Clock): string[] {
  if (lead.follow_up_paused) return [lead.follow_up_paused_by === 'lead' ? f.pausedByLead : f.paused];
  if (!statuses.includes(lead.status)) return [f.none];
  const lines: string[] = [];
  if (lead.follow_up_note) lines.push(NOTES[lead.follow_up_note]);
  else lines.push(lead.next_follow_up_at ? f.next.replace('{time}', fullTime(lead.next_follow_up_at, clock)) : f.none);
  if (lead.follow_up_stage > 0 && total) {
    lines.push(f.stage.replace('{n}', String(lead.follow_up_stage)).replace('{total}', String(total)));
  }
  return lines;
}

/**
 * The hamish note of the thread and the per-lead pause (L2). A lead who sent «وقف» opted out of
 * marketing: resuming asks first.
 */
export function FollowUpLine({ lead, onDone }: FollowUpLineProps) {
  const queryClient = useQueryClient();
  const settings = useQuery(settingsQuery);
  const [confirming, setConfirming] = useState(false);
  const pause = useMutation({
    mutationFn: setFollowUpPaused,
    onSuccess: async () => {
      setConfirming(false);
      onDone(t.inbox.followUpSaved);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: () => onDone(t.common.error, 'error'),
  });
  const resume = () => pause.mutate({ id: lead.id, paused: false });
  const byLead = lead.follow_up_paused && lead.follow_up_paused_by === 'lead';
  const clock = useClock();

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold">{f.title}</h3>
      <div className="border-s border-s-rule ps-3 text-xs text-ink-2">
        {followUpText(lead, settings.data?.follow_up_hours.length, clock).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        disabled={pause.isPending}
        onClick={() => (!lead.follow_up_paused ? pause.mutate({ id: lead.id, paused: true }) : byLead ? setConfirming(true) : resume())}
      >
        {lead.follow_up_paused ? f.resume : f.pause}
      </Button>
      {confirming && (
        <Dialog
          title={f.resumeLeadTitle}
          glyph={{ tone: 'act', shape: 'hollow' }}
          onClose={() => setConfirming(false)}
          compact
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger-quiet" disabled={pause.isPending} onClick={resume}>
                {f.resumeLeadYes}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-2">{f.resumeLeadConfirm}</p>
        </Dialog>
      )}
    </div>
  );
}
