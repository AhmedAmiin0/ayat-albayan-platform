import { replyConfirmPath, type ConfirmRoute } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { apiSend, pathKey, t, Button, ErrorLine } from '@ab/mobile-kit';
import { confirmFailureText } from '@/sales/sales';
import { refreshChat } from '@/inbox/thread/hooks/inbox-sync';

interface ReplyConfirmButtonProps {
  phone: string;
  lessonId: string;
  route: ConfirmRoute;
  /** The spoken name says which lesson. */
  label: string;
}

/** Scheduled to confirmed with no message to anyone; the chat re-reads either way. */
export function ReplyConfirmButton({ phone, lessonId, route, label }: ReplyConfirmButtonProps) {
  const client = useQueryClient();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const confirm = useMutation({
    mutationFn: () => apiSend('POST', replyConfirmPath(lessonId, route)),
    onSettled: () =>
      Promise.all([
        refreshChat(client, phone),
        ...[pathKey('/sales/schedule'), pathKey('/lessons')].map((queryKey) => client.invalidateQueries({ queryKey })),
      ]),
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
      {confirm.isError ? (
        <ErrorLine message={confirmFailureText(confirm.error, cycle, tz)} />
      ) : null}
    </>
  );
}
