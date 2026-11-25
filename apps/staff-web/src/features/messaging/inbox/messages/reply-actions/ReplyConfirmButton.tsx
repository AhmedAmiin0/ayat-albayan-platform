import { replyConfirmPath, type ConfirmRoute } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { salesKeys } from '@/features/sales/keys';
import { confirmErrorText } from '@/features/sales/sales';
import { lessonKeys } from '@/features/teaching/schedule';
import { apiSend } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { threadKeys } from '@/features/messaging/inbox/api/keys';

export interface ReplyConfirmButtonProps {
  phone: string;
  lessonId: string;
  route: ConfirmRoute;
  /** Names the lesson for the screen reader and the tooltip. */
  label: string;
}

/** Moves scheduled to confirmed via the viewer's route, sending no message to anyone. */
export function ReplyConfirmButton({ phone, lessonId, route, label }: ReplyConfirmButtonProps) {
  const client = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => apiSend('POST', replyConfirmPath(lessonId, route)),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: threadKeys.detail(phone) }),
        refreshAnchored(client, phone),
        client.invalidateQueries({ queryKey: lessonKeys.all }),
        client.invalidateQueries({ queryKey: salesKeys.schedule }),
      ]),
  });
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={label}
        title={label}
        disabled={confirm.isPending}
        onClick={() => confirm.mutate()}
      >
        {confirm.isPending ? t.common.saving : t.inbox.replyAction.confirm}
      </Button>
      {confirm.isError && (
        <p role="alert" className="basis-full text-xs text-danger">
          {confirmErrorText(confirm.error)}
        </p>
      )}
    </>
  );
}
