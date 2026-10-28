import { replyConfirmPath, type ConfirmRoute } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { confirmErrorText } from '@/features/sales/sales';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

export interface ReplyConfirmButtonProps {
  phone: string;
  lessonId: string;
  route: ConfirmRoute;
  /** «تأكيد حلقة الأحد 4 أكتوبر 17:00 (بتوقيت الرياض)»: which lesson, for the screen reader and the tooltip. */
  label: string;
}

/**
 * «تأكيد الحلقة» under a guardian's «نعم» (owner 2026-10-28): scheduled → confirmed by the viewer's
 * route (replyRights), no message to anyone. Either way the chat re-reads, so the note then reads
 * «تم تأكيد حلقة …», or the button goes when the lesson changed elsewhere.
 */
export function ReplyConfirmButton({ phone, lessonId, route, label }: ReplyConfirmButtonProps) {
  const client = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => apiSend('POST', replyConfirmPath(lessonId, route)),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['threads', 'detail', phone] }),
        client.invalidateQueries({ queryKey: ['lessons'] }),
        client.invalidateQueries({ queryKey: ['sales', 'schedule'] }),
      ]),
  });
  return (
    <>
      <Button type="button" size="sm" variant="secondary" aria-label={label} title={label} disabled={confirm.isPending} onClick={() => confirm.mutate()}>
        {confirm.isPending ? t.common.saving : t.inbox.replyAction.confirm}
      </Button>
      {confirm.isError && <p role="alert" className="basis-full text-xs text-danger">{confirmErrorText(confirm.error)}</p>}
    </>
  );
}
