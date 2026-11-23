import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import type { ChannelRef } from '#/components/channel/api.ts';
import { ListSkeleton } from '#/components/ui/display/index.ts';
import { Button, FormAlert } from '#/components/ui/form/index.ts';
import { Dialog } from '#/components/ui/overlay/index.ts';
import { useClock } from '#/lib/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { ReadsList } from './ReadsList';
import { useMessageReads } from './use-message-reads';

const r = t.studentChannel.reads;

interface Props {
  refs: ChannelRef;
  message: ChannelMessageView;
  tz: string;
  now: Date;
  onClose: () => void;
}

/**
 * «من قرأ الرسالة» (FamChatWebInfo, S13): the message itself, then «قرأها» with each reader's
 * time and «لم يقرأها بعد», each «لا أحد بعد» when empty; a skeleton while loading, the error line,
 * and «إغلاق». The dialog's card enters with the kit's dialog motion; Esc closes it.
 */
export function ReadsDialog({ refs, message, tz, now, onClose }: Props) {
  const reads = useMessageReads(refs, message.id);
  const clock = useClock();
  const when = (iso: string) => channelTimeText({ iso, tz, now, ...clock });
  const close = (
    <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
      {t.common.close}
    </Button>
  );
  return (
    <Dialog title={r.title} onClose={onClose} layout="center" actions={close}>
      <div className="grid gap-4">
        {message.body && (
          <p className="rounded-md bg-sunk px-3 py-2 text-sm text-ink-2 line-clamp-3">
            {message.body}
          </p>
        )}
        {reads.isPending && <ListSkeleton />}
        {reads.isError && <FormAlert>{r.failed}</FormAlert>}
        {reads.data && (
          <>
            <ReadsList
              title={r.read}
              read
              people={reads.data.read.map((p) => ({ ...p, when: when(p.at) }))}
            />
            <ReadsList
              title={r.unread}
              read={false}
              people={reads.data.unread.map((p) => ({ ...p, when: '' }))}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
