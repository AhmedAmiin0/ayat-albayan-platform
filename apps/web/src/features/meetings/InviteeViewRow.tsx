import type { MeetingInviteeView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { MEETINGS_KEY } from './internal-api';
import { InviteResultRow } from './InviteResultRow';
import { inviteStatusText } from './invite-status';
import { meetingErrorText, resendInvite } from './meeting-invites-api';

const R = t.meetingInvites.results;

/** One invitee with its status; a family or a phone gets «أعد الإرسال» (a new personal link and text, shown once). */
export function InviteeViewRow({ meetingId, invitee }: { meetingId: string; invitee: MeetingInviteeView }) {
  const queryClient = useQueryClient();
  // One id per click: a retry after a lost answer reuses it, a success starts a new one (like mobile).
  const requestId = useRef(crypto.randomUUID());
  const resend = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => {
      requestId.current = crypto.randomUUID();
      return queryClient.invalidateQueries({ queryKey: MEETINGS_KEY });
    },
  });
  const canResend = invitee.kind !== 'staff' && invitee.status !== 'cancelled';
  return (
    <li className="grid gap-1.5 border-b border-rule py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span dir={invitee.kind === 'phone' ? 'ltr' : undefined} className="font-semibold">{invitee.display_name}</span>
        <span className="text-xs text-ink-2">{inviteStatusText(invitee)}</span>
        {canResend && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ms-auto"
            aria-label={`${R.resend} ${invitee.display_name}`}
            disabled={resend.isPending}
            onClick={() => resend.mutate({ meetingId, inviteeId: invitee.id, clientRequestId: requestId.current })}
          >
            {R.resend}
          </Button>
        )}
      </div>
      {resend.data && (
        <ul>
          <InviteResultRow result={resend.data} />
        </ul>
      )}
      {resend.isError && <FormAlert>{meetingErrorText(resend.error)}</FormAlert>}
    </li>
  );
}
