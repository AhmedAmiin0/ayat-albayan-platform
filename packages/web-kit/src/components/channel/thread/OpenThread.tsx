import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { BubbleToolsContext } from '@ab/web-kit/components/channel/bubble/bubble-tools';
import { ChannelComposer } from '@ab/web-kit/components/channel/composer/ChannelComposer';
import { draftKey } from '@ab/web-kit/components/channel/composer/draft-store';
import { ConnectionBar } from '@ab/web-kit/components/channel/head/ConnectionBar';
import { ThreadHead } from '@ab/web-kit/components/channel/head/ThreadHead';
import { ReadsDialog } from '@ab/web-kit/components/channel/reads/ReadsDialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChannelLoadFailed } from './ChannelLoadFailed';
import { ChannelMessages } from './ChannelMessages';
import type { useChannelThread } from './use-channel-thread';
import { useStickToEnd } from './use-stick-to-end';

const NOTE = 'rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2';
const c = t.studentChannel;
/** For a monitor of a closed channel, also why nobody writes yet. */
const readOnlyText = (open: boolean | undefined) =>
  open === false ? `${c.readOnly} ${c.closedMonitor}` : c.readOnly;

interface Props {
  thread: ReturnType<typeof useChannelThread> & { mode: 'write' | 'read' };
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  head: { label: string; heading: string };
}

/** A failed re-read is one inline line: the thread and the draft stay. */
export function OpenThread({ thread, pages, refs, tz, head }: Props) {
  const { query, first, mode, send, now } = thread;
  const [replyTo, setReplyTo] = useState<ChannelMessageView | null>(null);
  const [info, setInfo] = useState<ChannelMessageView | null>(null);
  const end = useStickToEnd(first?.messages.at(-1)?.id);
  const older = {
    has: query.hasNextPage,
    loading: query.isFetchingNextPage,
    load: () => void query.fetchNextPage(),
  };
  return (
    <section aria-label={head.label} className="grid gap-3">
      <ThreadHead title={head.heading} {...{ pages, refs, tz, now }} />
      <ConnectionBar />
      {mode === 'read' && <p className={NOTE}>{readOnlyText(first?.open)}</p>}
      {query.isError && <ChannelLoadFailed onRetry={() => void query.refetch()} inline />}
      <BubbleToolsContext value={{ reply: setReplyTo, info: setInfo }}>
        <ChannelMessages {...{ pages, refs, tz, now, mode, older }} />
      </BubbleToolsContext>
      <div ref={end} className="scroll-mb-[var(--chat-end-gap,0px)]" />
      {mode === 'write' && (
        <ChannelComposer
          key={draftKey(refs)}
          refs={refs}
          draft={draftKey(refs)}
          send={send}
          reply={{ to: replyTo, cancel: () => setReplyTo(null) }}
        />
      )}
      {info && (
        <ReadsDialog refs={refs} message={info} tz={tz} now={now} onClose={() => setInfo(null)} />
      )}
    </section>
  );
}
