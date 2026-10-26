import { RATING_TEMPLATE, type MessageView, type TemplateView, type ThreadView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { errorCode } from '@/features/teaching/schedule/api';
import { templatesQuery } from '@/features/messaging/templates/api';
import { t } from '@/lib/i18n/i18n';
import { sendRating } from '../api/api';
import { useInboxMode } from '../shared/mode';
import { sendStart, settleOwnSend } from '../composer/lib/send-start';

const r = t.inbox.rating;
const ERRORS: Record<string, string | undefined> = {
  template_not_approved: r.notApproved,
  no_completed_lesson: r.noLesson,
  not_a_guardian: r.noLesson,
};

const errorText = (error: unknown): string => ERRORS[errorCode(error) ?? ''] ?? r.failed;
/** queued = the send gate is closed: it waits; anything else went to WhatsApp. */
const doneText = (sent: MessageView | undefined): string | null => (sent ? (sent.status === 'queued' ? r.queued : r.sent) : null);
const isApproved = (templates: readonly TemplateView[] | undefined): boolean =>
  templates?.some((x) => x.key === RATING_TEMPLATE && x.status === 'approved') ?? false;

/**
 * «إرسال تقييم الحلقة» (admin mode only, a guardian's closed chat): the API picks the children's latest lesson
 * that took place and sends lesson_rating; one tap on a button reopens the 24 h window. One request
 * id per press, kept across a retry (rule 8). Disabled until Meta approves the template. A sent rating
 * counts as her own send (own-send).
 */
export function SendRatingButton({ thread }: { thread: Pick<ThreadView, 'phone_e164' | 'guardian_id'> }) {
  const queryClient = useQueryClient();
  const admin = useInboxMode() === 'admin';
  const templates = useQuery({ ...templatesQuery, enabled: admin });
  const requestId = useRef(crypto.randomUUID());
  const send = useMutation({
    mutationFn: sendRating,
    onMutate: sendStart,
    onSuccess: async (view, sent, start) => {
      // Her own send: the log snaps to it when the row arrives (W4), like a text or a template.
      settleOwnSend(sent.phone, view.id, start);
      requestId.current = crypto.randomUUID();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  if (!admin || !thread.guardian_id) return null;
  const approved = isApproved(templates.data);
  const done = doneText(send.data);
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        disabled={!approved || send.isPending}
        onClick={() => send.mutate({ phone: thread.phone_e164, clientRequestId: requestId.current })}
      >
        {send.isPending ? r.sending : r.send}
      </Button>
      {!approved && templates.isSuccess && <p className="text-xs text-ink-3">{r.notApproved}</p>}
      {done && <p role="status" className="text-xs text-ink-2">{done}</p>}
      {send.isError && <FormAlert>{errorText(send.error)}</FormAlert>}
    </div>
  );
}
