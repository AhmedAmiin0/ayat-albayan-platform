import { replyConfirmPath, type ConfirmRoute } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClockCycle } from '@/core/lib/clock';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { confirmFailureText } from '@/sales';
import { ErrorLine } from '../../ErrorLine';
import { threadKey } from '../../thread/hooks/thread-cache';

interface ReplyConfirmButtonProps {
  phone: string;
  lessonId: string;
  route: ConfirmRoute;
  /** «تأكيد حلقة الأحد 4 أكتوبر 17:00 (بتوقيت الرياض)»: the spoken name says which lesson. */
  label: string;
}

/**
 * «تأكيد الحلقة» under a guardian's «نعم» (owner 2026-10-28): scheduled → confirmed by the viewer's
 * route, no message to anyone. Either way the chat (and the schedules) re-read: the note then says
 * «تم تأكيد حلقة …», or the button goes when the lesson changed elsewhere.
 */
export function ReplyConfirmButton({ phone, lessonId, route, label }: ReplyConfirmButtonProps) {
  const client = useQueryClient();
  const cycle = useClockCycle();
  const confirm = useMutation({
    mutationFn: () => apiSend('POST', replyConfirmPath(lessonId, route)),
    onSettled: () =>
      Promise.all(
        [threadKey(phone), pathKey('/sales/schedule'), pathKey('/lessons')].map((queryKey) => client.invalidateQueries({ queryKey })),
      ),
  });
  return (
    <>
      <Button
        variant="secondary"
        label={confirm.isPending ? t.common.saving : t.inbox.replyAction.confirm}
        accessibilityLabel={label}
        busy={confirm.isPending}
        onPress={() => confirm.mutate()}
      />
      {confirm.isError ? <ErrorLine message={confirmFailureText(confirm.error, cycle)} /> : null}
    </>
  );
}
