import type { ChannelPage } from '@ab/shared';
import { ChannelPresenceLine } from '@ab/web-kit/components/channel/presence/ChannelPresenceLine';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { ChannelComposer } from '@ab/web-kit/components/channel/composer/ChannelComposer';
import { draftKey } from '@ab/web-kit/components/channel/composer/draft-store';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChannelLoadFailed } from './ChannelLoadFailed';
import { ChannelMessages } from './ChannelMessages';
import type { useChannelThread } from './use-channel-thread';
import { useStickToEnd } from './use-stick-to-end';

const NOTE = 'rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2';
const c = t.studentChannel;
/** «للاطلاع فقط», and for a monitor of a closed channel why nobody writes yet. */
const readOnlyText = (open: boolean | undefined) =>
  open === false ? `${c.readOnly} ${c.closedMonitor}` : c.readOnly;

interface Props {
  thread: ReturnType<typeof useChannelThread> & { mode: 'write' | 'read' };
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  head: { label: string; heading: string };
}

/**
 * A thread that reads (a monitor) or writes (a participant's open channel): the presence line,
 * the messages, the newest kept in view, and the composer. A failed re-read is one inline line:
 * the thread and the draft stay.
 */
export function OpenThread({ thread, pages, refs, tz, head }: Props) {
  const { query, first, mode, newest, send, now } = thread;
  const end = useStickToEnd(newest?.id);
  const older = {
    has: query.hasNextPage,
    loading: query.isFetchingNextPage,
    load: () => void query.fetchNextPage(),
  };
  return (
    <section aria-label={head.label} className="grid gap-3">
      {head.heading && <h2 className="font-display text-h3 font-bold">{head.heading}</h2>}
      <ChannelPresenceLine chat={refs} tz={tz} now={now} />
      {mode === 'read' && <p className={NOTE}>{readOnlyText(first?.open)}</p>}
      {query.isError && <ChannelLoadFailed onRetry={() => void query.refetch()} inline />}
      <ChannelMessages {...{ pages, refs, tz, now, mode, older }} />
      <div ref={end} />
      {mode === 'write' && (
        <ChannelComposer
          key={draftKey(refs)}
          draft={draftKey(refs)}
          pending={send.pending}
          failed={send.failed}
          onSend={send.send}
        />
      )}
    </section>
  );
}
