import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReadsList } from '@ab/web-kit/components/channel/reads/ReadsList';
import { useMessageReads } from '@ab/web-kit/components/channel/reads/use-message-reads';

const r = t.studentChannel.reads;

interface Props {
  refs: ChannelRef;
  message: ChannelMessageView;
  tz: string;
  now: Date;
  onClose: () => void;
}

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
