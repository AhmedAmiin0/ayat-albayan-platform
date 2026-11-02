import type { MeetingInviteeView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { MEETINGS_KEY } from '@/features/teaching/meetings/internal/internal-api';
import { InviteResultRow } from './InviteResultRow';
import { inviteeName, inviteStatusText, mayResend, nameDir } from './invite-status';
import { meetingErrorText, resendInvite } from './meeting-invites-api';

const R = t.meetingInvites.results;

interface Props {
  meetingId: string;
  invitee: MeetingInviteeView;
  /** Admin / sales: a typed phone's row may be resent (the API answers 403 to anyone else). */
  mayInvitePhones: boolean;
}

/**
 * One invitee with its status; a family (or, for admin and sales, a phone) gets «أعد الإرسال» (a new
 * personal link and text, shown once). A phone row without a name (hidden from the caller) reads «رقم هاتف».
 */
export function InviteeViewRow({ meetingId, invitee, mayInvitePhones }: Props) {
  const queryClient = useQueryClient();
  // One id per click: a retry after a lost answer reuses it, a success starts a new one.
  const requestId = useRef(crypto.randomUUID());
  const resend = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => {
      requestId.current = crypto.randomUUID();
      return queryClient.invalidateQueries({ queryKey: MEETINGS_KEY });
    },
  });
  const canResend = mayResend(invitee, mayInvitePhones);
  const name = inviteeName(invitee);
  return (
    <li className="grid gap-1.5 border-b border-rule py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span dir={nameDir(invitee)} className="font-semibold">
          {name}
        </span>
        <span className="text-xs text-ink-2">{inviteStatusText(invitee)}</span>
        {canResend && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ms-auto"
            aria-label={`${R.resend} ${name}`}
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
